import { InjectRepository } from "@nestjs/typeorm";
import { Channel as DiscordChannel, ChannelType, ChatInputCommandInteraction, Role as DiscordRole } from "discord.js";
import { Repository } from "typeorm";
import { Platform } from "../../../../../constants";
import { ActionDescriptor } from "../../../models/action.entity";
import { PLATFORM_CHOICES } from "../../../util";
import { Command } from "../../decorators/command.decorator";
import { Interaction } from "../../decorators/interaction.decorator";
import { Boolean, Channel, Role, String } from "../../decorators/option.decorator";
import { SlashCommand } from "../../decorators/slash-command.decorator";

@SlashCommand({ name: "quick-setup", description: "Quickly set up actions for a specific channel." })
export class QuickSetupCommand {
    constructor(@InjectRepository(ActionDescriptor) actions: Repository<ActionDescriptor>) {}

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
    ) {}

    @Command({ name: "rename", description: "Set up live indicator emojis for a channel." })
    rename(
        @Channel({ name: "channel", description: "The channel to set up", required: true, channel_types: []}) channel: DiscordChannel,
        @String({
            name: "base-name",
            description: "Base name for the channel. If not set, defaults to provided channel's name.",
        })
        baseName?: string,
    ) {
    }

    @Command({ name: "threads-migration", description: "Migrate setup for a stream to threads!" })
    migrateToThreads(
        @Channel({ name: "channel", description: "The channel to migrate & set up new actions for", required: true })
        channel: DiscordChannel,
    ) {}
}
