import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    AutocompleteInteraction,
    Client,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    InteractionType,
    ActivityType,
    PresenceStatusData,
} from "discord.js";
import { DiscordConfig } from "../../../modules/config/config";
import { Repository } from "typeorm";
import { GuildSettings } from "../models/settings.entity";
import { getCommandMetadata, SlashCommand } from "./commands/slash-command";
import { getEvents, handleEvent, On } from "./on-event";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { FetchPostsCommand } from "../../youtube";
import { ChannelInfo, CommunityPost } from "yt-scraping-utilities";
import { DiscordUtil } from "../util";
import { handleAutocomplete } from "./commands/autocomplete";
import { Platform, SUPPORTED_PLATFORMS } from "../../../constants";
import { Util } from "../../../util";
import { MultipageMessage } from "../../../shared/util/multipage-message";
import { getActions } from "../actions/action";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectCommands } from "./commands/slash-commands.provider";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { ChannelQuery } from "../../../modules/platforms/queries";
import { ChannelEntity } from "../../../modules/platforms/models/channel.entity";

@Injectable()
export class DiscordClientService extends Client {
    private readonly logger = new Logger(DiscordClientService.name);
    private readonly commands: Map<string, SlashCommand> = new Map();
    private readonly statusReady: Map<Platform, boolean> = new Map();
    private status: PresenceStatusData = "dnd";

    constructor(
        private readonly configService: ConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        @InjectRepository(GuildSettings)
        private readonly settingsRepository: Repository<GuildSettings>,
        @InjectCommands() slashCommands: SlashCommand[],
        private readonly eventEmitter: EventEmitter2,
    ) {
        super({
            intents: ["Guilds", "GuildMessages", "MessageContent"],
        });

        for (const command of slashCommands) {
            const { commandData } = getCommandMetadata(command);
            this.commands.set(commandData.name, command);
        }

        for (const platform of SUPPORTED_PLATFORMS) {
            this.statusReady.set(
                platform,
                !configService.getOrThrow<boolean>(
                    `${platform.toUpperCase()}.active`,
                ),
            );
        }
    }

    public async login(token?: string): Promise<string> {
        const events = [...getEvents(this).keys()];
        this.logger.debug(
            `Registering event handler for @On marked events: ${events.join(
                ", ",
            )}`,
        );

        for (const event of events) {
            this.on(event, (...args) => this.handleEvent(event, ...args));
        }

        this.logger.debug(
            `Found ${this.commands.size} commands: ${[
                ...this.commands.keys(),
            ].join(", ")}.`,
        );

        this.logger.debug(
            `Found ${getActions().length} action types: ${getActions()
                .map(action => action.name)
                .join(", ")}.`,
        );

        const ret = await super.login(token);
        await this.refreshPresence();
        return ret;
    }

    private handleEvent(event: string, ...args: any[]): void {
        const { success, errors } = handleEvent(event, this, args);
        if (!success) {
            this.logger.warn("handleEvent failed.");
            for (const error of errors) this.logger.error(error);
        }
    }

    @OnEvent("*.ready")
    async platformReady(platform: Platform) {
        this.statusReady.set(platform, true);

        if (
            [...this.statusReady.values()].reduce(
                (prev, cur) => prev && (cur == undefined || cur),
            )
        ) {
            this.status = "online";
            this.refreshPresence();
        }
    }

    @On("ready")
    async ready() {
        await this.guilds.fetch();
        for (const guild of this.guilds.cache.values()) {
            const existing = await this.settingsRepository.findOne({
                where: { id: guild.id },
            });
            if (!existing) {
                this.logger.log(`Found new guild ${guild.name} (${guild.id})`);
                await this.settingsRepository.insert({
                    id: guild.id,
                });
            }
        }

        await this.application.fetch();
        if (this.configService.get<DiscordConfig>("DISCORD").cleanUpOnStart) {
            this.logger.debug("Cleaning up all old commands.");

            await this.application.commands.fetch();
            for (const commandId of this.application.commands.cache.keys()) {
                await this.application.commands.delete(commandId);
            }
        }

        const { deployGlobalCommands, testGuildId } =
            this.configService.get<DiscordConfig>("DISCORD");
        this.logger.debug(
            `Deploying slash commands ${
                deployGlobalCommands ? "globally" : `to ${testGuildId}`
            }.`,
        );

        for (const command of this.commands.values()) {
            const { commandData, forGuild } = getCommandMetadata(command);

            await this.application.commands.create(
                commandData,
                deployGlobalCommands
                    ? forGuild(
                          this.configService.get<DiscordConfig>("DISCORD")
                              .ownerGuild,
                      )
                    : this.configService.get<DiscordConfig>("DISCORD")
                          .testGuildId,
            );
            this.logger.debug(`Created command for ${commandData.name}`);
        }

        this.logger.log(`Signed in as ${this.user.tag} (${this.user.id}).`);

        this.eventEmitter.emit("discord.ready", "discord");
    }

    @On("interactionCreate")
    async handleSlashCommand(interaction: ChatInputCommandInteraction) {
        if (interaction.type != InteractionType.ApplicationCommand) return;

        const { commandName } = interaction;
        this.logger.debug(`Received slash command for ${commandName}.`);
        const handler = this.commands.get(commandName);

        if (!handler) return interaction.reply("Command not found!");
        await handler.execute(interaction);

        if (!interaction.replied) {
            this.logger.warn(
                `${commandName} (${interaction.id}) never got a reply!`,
            );
        }
    }

    @On("interactionCreate")
    handleAutocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.isAutocomplete()) return;

        const { commandName, options } = interaction;
        const { name } = options.getFocused(true);
        const command = this.commands.get(commandName);

        if (!command)
            return this.logger.warn(
                `Could not handle autocomplete for ${commandName} - ${name}: Command not found.`,
            );
        handleAutocomplete(interaction, command);
    }

    @On("messageCreate")
    async detectCommunityPostLink(message: Message) {
        if (message.author.id == this.user.id) return;

        const postIdRegex =
            /(?<=youtube.com\/post\/)Ug[A-z0-9_\-]+|(?<=youtube.com\/channel\/.+\/community\?lb=)Ug[A-z0-9_\-]+/g;

        const { content } = message;
        const ids = [...content.matchAll(postIdRegex)].flat();
        if (!ids || ids.length == 0) return;

        this.logger.debug(`Found community post IDs: ${ids}.`);

        const embeds: EmbedBuilder[] = [];
        for (const id of ids) {
            const { posts, channel } = await this.commandBus.execute<
                FetchPostsCommand,
                { posts: CommunityPost[]; channel: ChannelInfo }
            >(new FetchPostsCommand({ postId: id, includeChannelInfo: true }));
            const embed = DiscordUtil.postToEmbed(posts[0], channel);

            this.logger.debug(`Generated embed for ${id}.`);
            embeds.push(embed);
        }

        if (embeds.length == 1) {
            await message.reply({
                embeds,
                allowedMentions: { repliedUser: false },
            });
        } else {
            const reply = new MultipageMessage({
                message,
            });

            for (const embed of embeds) {
                reply.addPage({ embeds: [embed] });
            }

            await reply.send({
                replyPing: false,
            });
        }
    }

    @Interval(60000)
    private async refreshPresence(): Promise<void> {
        let name: string;

        if (this.status === "dnd") {
            name = "starting...";
        } else {
            const channels = (
                await this.queryBus.execute<ChannelQuery, ChannelEntity[]>(
                    new ChannelQuery({ query: {} }),
                )
            ).length;

            await this.guilds.fetch();
            const guilds = this.guilds.cache.size;

            name = `${channels} ${Util.pluralize(
                channels,
                "channel",
                "channels",
            )} in ${guilds} ${Util.pluralize(guilds, "server", "servers")}.`;
        }

        this.user.setPresence({
            activities: [
                {
                    name,
                    type: ActivityType.Watching,
                },
            ],
            status: this.status,
        });
    }
}
