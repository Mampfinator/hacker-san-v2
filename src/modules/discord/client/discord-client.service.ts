import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Client, CommandInteraction, Message, MessageEmbed } from "discord.js";
import { DiscordConfig } from "src/modules/config/config";
import { Repository } from "typeorm";
import { GuildSettings } from "../models/settings.entity";
import { getCommandMetadata, SlashCommand } from "./commands/slash-command";
import { DISCORD_EVENT_NAMES } from "./discord-client-constants";
import { handleEvent, On } from "./on-event";
import { InjectCommands } from "./commands/slash-commands.provider";
import { CommandBus } from "@nestjs/cqrs";
import { FetchPostCommand } from "src/modules/youtube/community-posts/commands/fetch-post.command";
import { ChannelInfo, CommunityPost } from "yt-scraping-utilities";
import { DiscordUtil } from "../util";

@Injectable()
export class DiscordClientService extends Client {
    private readonly logger = new Logger(DiscordClientService.name);
    private readonly commands: Map<string, SlashCommand> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly commandBus: CommandBus,
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

    public login(token?: string): Promise<string> {
        for (const event of DISCORD_EVENT_NAMES)
            this.on(event, (...args) => this.handleEvent(event, ...args));
        this.logger.debug(
            `Found ${this.commands.size} commands: ${[
                ...this.commands.keys(),
            ]}.`,
        );
        return super.login(token);
    }

    private handleEvent(event: string, ...args: any[]): void {
        const { success, errors } = handleEvent(event, this, args);
        if (!success) {
            this.logger.debug("handleEvent failed.");
            for (const error of errors) this.logger.error(error);
        } else {
            this.logger.debug(`Handled ${event}.`);
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
    handleSlashCommand(interaction: CommandInteraction) {
        if (!interaction.isApplicationCommand()) return;

        const { commandName } = interaction;
        const handler = this.commands.get(commandName);

        if (!handler) return interaction.reply("Command not found!");
        handler.execute(interaction);
    }

    @On("interactionCreate")
    handleAutocomplete(interaction: CommandInteraction) {
        if (!interaction.isAutocomplete()) return;
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
            >(new FetchPostCommand(id, true));
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
}
