import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, Message, EmbedBuilder, ActivityType, PresenceStatusData, CommandInteraction } from "discord.js";
import { DiscordConfig } from "../config/config";
import { In, Repository } from "typeorm";
import { GuildSettings } from "./models/settings.entity";
import { getEvents, handleEvent, On } from "../../shared/decorators/on-event";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ChannelInfo, CommunityPost } from "yt-scraping-utilities";
import { DiscordUtil } from "./util";
import { Platform, SUPPORTED_PLATFORMS } from "../../constants";
import { Util } from "../../util";
import { MultipageMessage } from "../../shared/util/multipage-message";
import { getActions } from "./actions/decorators/action";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { FindChannelQuery } from "../platforms/queries";
import { FetchPostCommand } from "../youtube/community-posts/commands/fetch-post.command";
import { SlashCommandDispatcher } from "./slash-command/slash-command.dispatcher";
import { SlashCommandDiscovery } from "./slash-command/slash-command.discovery";

@Injectable()
export class DiscordClientService extends Client {
    private readonly logger = new Logger(DiscordClientService.name);
    private readonly statusReady: Map<Platform, boolean> = new Map();
    private status: PresenceStatusData = "dnd";

    constructor(
        private readonly configService: ConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        @InjectRepository(GuildSettings)
        private readonly settingsRepository: Repository<GuildSettings>,
        private readonly eventEmitter: EventEmitter2,
        private readonly commandDiscovery: SlashCommandDiscovery,
        private readonly commandDispatcher: SlashCommandDispatcher,
    ) {
        super({
            intents: ["Guilds", "GuildMessages", "MessageContent"],
        });

        for (const platform of SUPPORTED_PLATFORMS) {
            this.statusReady.set(platform, !configService.getOrThrow<boolean>(`${platform.toUpperCase()}.active`));
        }
    }

    public async login(token?: string): Promise<string> {
        const events = [...getEvents(this).keys()];
        this.logger.debug(`Registering event handler for @On marked events: ${events.join(", ")}`);

        for (const event of events) {
            this.on(event, (...args) => this.handleEvent(event, ...args));
        }


        for (const apiCommand of this.commandDiscovery.getApiData()) {
            await this.application.commands.create(apiCommand, this.configService.get<string>("DISCORD.testGuildId"));
            this.logger.debug(`Created command ${apiCommand.name}.`);
        }

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

        if ([...this.statusReady.values()].reduce((prev, cur) => prev && (cur == undefined || cur))) {
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

        const { deployGlobalCommands, testGuildId } = this.configService.get<DiscordConfig>("DISCORD");
        this.logger.debug(`Deploying slash commands ${deployGlobalCommands ? "globally" : `to ${testGuildId}`}.`);

        this.logger.log(`Signed in as ${this.user.tag} (${this.user.id}).`);

        this.eventEmitter.emit("discord.ready", "discord");
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
            const { post, channel } = await this.commandBus.execute<
                FetchPostCommand,
                { post: CommunityPost; channel: ChannelInfo }
            >(new FetchPostCommand({ includeChannel: true, postId: id }));
            const embed = DiscordUtil.postToEmbed(post, channel);

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

    @On("interactionCreate")
    handleSlashCommand(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        this.commandDispatcher.dispatch(interaction);
    }

    @Interval(60000)
    private async refreshPresence(): Promise<void> {
        let name: string;

        if (this.status === "dnd") {
            name = "starting...";
        } else {
            // workaround to fix the QueryBuilder from having a stroke

            const channels = (
                await this.queryBus.execute(new FindChannelQuery().forPlatform(In(["youtube", "twitter"])))
            ).length;


            await this.guilds.fetch();
            const guilds = this.guilds.cache.size;

            name = `${channels} ${Util.pluralize(channels, "channel", "channels")} in ${guilds} ${Util.pluralize(
                guilds,
                "server",
                "servers",
            )}.`;
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
