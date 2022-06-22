import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
    AutocompleteInteraction,
    Client,
    CommandInteraction,
    Message,
    MessageEmbed,
} from "discord.js";
import { DiscordConfig } from "src/modules/config/config";
import { Repository } from "typeorm";
import { GuildSettings } from "../models/settings.entity";
import { getCommandMetadata, SlashCommand } from "./commands/slash-command";
import { DISCORD_EVENT_NAMES } from "./discord-client-constants";
import { handleEvent, On } from "./on-event";
import { InjectCommands } from "./commands/slash-commands.provider";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { FetchPostCommand } from "src/modules/youtube/community-posts/commands/fetch-post.command";
import { ChannelInfo, CommunityPost } from "yt-scraping-utilities";
import { DiscordUtil } from "../util";
import { handleAutocomplete } from "./commands/autocomplete";
import { Interval } from "@nestjs/schedule";
import { SUPPORTED_PLATFORMS } from "src/constants";
import { ChannelsQuery } from "src/modules/platforms/queries/channels.query";
import { ChannelsQueryResult } from "src/modules/platforms/queries/channels.handler";
import { Util } from "src/util";

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
            intents: ["GUILDS", "GUILD_MESSAGES"],
        });

        for (const command of slashCommands) {
            const { commandData } = getCommandMetadata(command);
            this.commands.set(commandData.name, command);
        }
    }

    public async login(token?: string): Promise<string> {
        for (const event of DISCORD_EVENT_NAMES)
            this.on(event, (...args) => this.handleEvent(event, ...args));
        this.logger.debug(
            `Found ${this.commands.size} commands: ${[
                ...this.commands.keys(),
            ]}.`,
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

        for (const command of this.commands.values()) {
            const { commandData, forGuild } = getCommandMetadata(command);
            await this.application.commands.create(
                commandData,
                process.env.NODE_ENV === "production"
                    ? forGuild(
                          this.configService.get<DiscordConfig>("DISCORD")
                              .ownerGuild,
                      )
                    : this.configService.get<DiscordConfig>("DISCORD")
                          .testGuildId,
            );
            this.logger.debug(`Created command for ${commandData.name}`);
        }
    }

    @On("interactionCreate")
    async handleSlashCommand(interaction: CommandInteraction) {
        if (!interaction.isApplicationCommand()) return;

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
        const postIdRegex =
            /(?<=youtube.com\/post\/)Ug[A-z0-9_\-]+|(?<=youtube.com\/channel\/.+\/community?lb=)Ug[A-z0-9_\-]+/g;

        const { content } = message;
        const ids = postIdRegex.exec(content);
        if (!ids || ids.length == 0) return;

        const embeds: MessageEmbed[] = [];
        for (const id of ids) {
            const { posts, channel } = await this.commandBus.execute<
                FetchPostCommand,
                { posts: CommunityPost[]; channel: ChannelInfo }
            >(new FetchPostCommand(id, { includeChannelInfo: true }));
            const embed = DiscordUtil.postToEmbed(posts[0], channel);

            this.logger.debug(`Generated embed for ${id}.`);
            embeds.push(embed);
        }

        if (embeds.length > 0) {
            await message.reply({
                embeds,
                allowedMentions: { repliedUser: false },
            });
        } else {
            this.logger.error(
                `Found IDs but did not manage to generate embeds.`,
            );
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

        /*this.user.setActivity({
            type: "WATCHING",
            name: `${channels} channels in ${this.guilds.cache.size} servers.`
        });*/
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
                    type: "WATCHING",
                },
            ],
            status: "dnd",
        });
    }
}
