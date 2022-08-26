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
} from "discord.js";
import { DiscordConfig } from "src/modules/config/config";
import { Repository } from "typeorm";
import { GuildSettings } from "../models/settings.entity";
import { getCommandMetadata, SlashCommand } from "./commands/slash-command";
import { getEvents, handleEvent, On } from "./on-event";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { FetchPostsCommand } from "src/modules/youtube/community-posts/commands/fetch-posts.command";
import { ChannelInfo, CommunityPost } from "yt-scraping-utilities";
import { DiscordUtil } from "../util";
import { handleAutocomplete } from "./commands/autocomplete";
import { SUPPORTED_PLATFORMS } from "src/constants";
import { ChannelsQuery } from "src/modules/platforms/queries/channels.query";
import { ChannelsQueryResult } from "src/modules/platforms/queries/channels.handler";
import { Util } from "src/util";
import { MultipageMessage } from "src/shared/util/multipage-message";
import { getActions } from "../actions/action";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectCommands } from "./commands/slash-commands.provider";

@Injectable()
export class DiscordClientService extends Client {
    private readonly logger = new Logger(DiscordClientService.name);
    private readonly commands: Map<string, SlashCommand> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        @InjectRepository(GuildSettings)
        private readonly settingsRepository: Repository<GuildSettings>,
        @InjectCommands() slashCommands: SlashCommand[],
    ) {
        super({
            intents: ["Guilds", "GuildMessages"],
        });

        for (const command of slashCommands) {
            const { commandData } = getCommandMetadata(command);
            this.commands.set(commandData.name, command);
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
                channel: message.channel as any,
            });

            for (const embed of embeds) {
                reply.addPage({ embeds: [embed] });
            }

            await reply.send({
                asReply: true,
                message,
                replyOptions: { allowedMentions: { repliedUser: false } },
            });
        }
    }

    @Interval(60000)
    private async refreshPresence() {
        let channels = 0;
        for (const platform of SUPPORTED_PLATFORMS) {
            const response = await this.queryBus.execute<
                ChannelsQuery,
                ChannelsQueryResult
            >(new ChannelsQuery(platform));
            channels += response.channels.length;
        }

        await this.guilds.fetch();

        const guilds = this.guilds.cache.size;

        this.user.setPresence({
            activities: [
                {
                    name: `${channels} ${Util.pluralize(
                        channels,
                        "channel",
                        "channels",
                    )} in ${guilds} ${Util.pluralize(
                        guilds,
                        "server",
                        "servers",
                    )}.`,
                    type: ActivityType.Watching,
                },
            ],
            status: "online",
        });
    }
}
