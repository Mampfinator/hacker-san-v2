import { CommandBus } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Channel as DiscordChannel, ChatInputCommandInteraction, Colors, EmbedBuilder, GuildChannel, Role as DiscordRole } from "discord.js";
import { Repository } from "typeorm";
import { Platform } from "../../../../../constants";
import { EnsureChannelCommand } from "../../../../platforms/commands/ensure-channel.command";
import { ActionDescriptor } from "../../../models/action.entity";
import { PLATFORM_CHOICES } from "../../../util";
import { Command } from "../../decorators/command.decorator";
import { Interaction } from "../../decorators/interaction.decorator";
import { Boolean, Channel, Role, String } from "../../decorators/option.decorator";
import { SlashCommand } from "../../decorators/slash-command.decorator";
import { CHANNELID_OPTIONS, PLATFORM_OPTIONS } from "../../slash-command.constants";

@SlashCommand({ name: "quick-setup", description: "Quickly set up actions for a specific channel." })
export class QuickSetupCommand {
    constructor(
        private readonly commandBus: CommandBus,
        @InjectRepository(ActionDescriptor) private readonly actions: Repository<ActionDescriptor>,
    ) {}

    @Command({ name: "general", description: "General setup for a channel." })
    general(
        @String({
            name: "platform",
            description: "What platform these notifications should be for.",
            required: true,
            choices: PLATFORM_CHOICES,
        })
        platform: Platform,
        @String({ name: "channel", description: "The channel's ID or handle.", required: true })
        channelId: string,
        @Interaction() interaction: ChatInputCommandInteraction<"cached">,
        @Role({ name: "pingrole", description: "A role to ping for whatever you're setting up." }) role?: DiscordRole,
        @Channel({ name: "notif-channel", description: "Channel to send notifications in." })
        notifChannel?: DiscordChannel,
        @Channel({
            name: "stream-chat",
            description: "Stream chat. If you want to set up temporary threads, enable temp-threads.",
        })
        streamChat?: DiscordChannel,
        @Channel({ name: "tags-channel", description: "Channel to send tags in after a stream is over." })
        tagsChannel?: DiscordChannel,
        @Boolean({
            name: "temp-threads",
            description: "Use temporary chats in stream-chat for all stream related actions.",
        })
        useTempThreads?: boolean,
    ) {

    }

    @Command({ name: "rename", description: "Set up live indicator emojis for a channel." })
    async rename(
        @String(PLATFORM_OPTIONS) platform: Platform,
        @String(CHANNELID_OPTIONS) channelId: string,
        @Channel({ name: "for-channel", description: "The channel to set up", required: true })
        discordChannel: GuildChannel,
        @Interaction() interaction: ChatInputCommandInteraction,
        @String({
            name: "base-name",
            description: "Will be prefixed with 🔴/⚫. Defaults to selected channel's name.",
        })
        baseName?: string,
    ) {
        await interaction.deferReply();
        
        const name = baseName ?? discordChannel.name;
        const {success, channel} = await this.commandBus.execute(new EnsureChannelCommand(channelId, platform));
        const { guildId } = interaction;

        if (!success) return {embeds: [ new EmbedBuilder().setColor(Colors.Red).setTitle("Setup failed").setDescription("This likely means that the channel you were attempting to set up does not exist.")]}

        const actions = [
            this.actions.create({
                guildId,
                discordChannelId: discordChannel.id,
                channelId: channel.platformId,
                platform,
                type: "rename",
                onEvent: "live",
                data: {
                    name: `🔴 ${name}`
                }
            }), 
            this.actions.create({
                guildId,
                discordChannelId: discordChannel.id,
                channelId: channel.platformId,
                platform,
                type: "rename",
                onEvent: "offline",
                data: {
                    name: `⚫ ${name}`
                }
            }),
        ]

        try {
            await this.actions.insert(actions);
        } catch {
            return {embeds: [ new EmbedBuilder().setColor(Colors.Red).setTitle("Setup failed").setDescription("Failed creating new actions. This is likely an internal error, or you already have those same actions set up. If the problem persists, reach out to the bot developer!")]}
        }

        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle("Actions created")
                    .setDescription(`Created two rename actions for ${channel.name} (${channel.platform}, ${channel.platformId}):`)
                    .addFields(...actions.map(action => action.toEmbedField()))
            ]
        }
    }

    @Command({ name: "threads-migration", description: "Migrate setup for a stream to threads!" })
    migrateToThreads(
        @Channel({ name: "channel", description: "The channel to migrate & set up new actions for", required: true })
        channel: DiscordChannel,
    ) {}
}
