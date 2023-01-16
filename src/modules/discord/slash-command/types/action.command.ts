import { InjectRepository } from "@nestjs/typeorm";
import { Channel as DiscordChannel, ChatInputCommandInteraction, Colors, EmbedBuilder } from "discord.js";
import { DeepPartial, In, Repository } from "typeorm";
import { Event, Platform } from "../../../../constants";
import { TEXT_CHANNEL_TYPES } from "../../discord.constants";
import { ActionDescriptor } from "../../models/action.entity";
import { PLATFORM_CHOICES } from "../../util";
import { Command } from "../decorators/command.decorator";
import { Interaction } from "../decorators/interaction.decorator";
import { Channel, String } from "../decorators/option.decorator";
import { BooleanOption, ChannelOption, StringOption } from "../decorators/option.decorator.types";
import { SlashCommand } from "../decorators/slash-command.decorator";

const PLATFORM_OPTIONS: Omit<StringOption, "type"> = {
    name: "platform",
    description: "Platform to trigger events for.",
    choices: PLATFORM_CHOICES,
    required: true,
}

const CHANNELID_OPTIONS: Omit<StringOption, "type"> = {
    name: "channel_id",
    description: "The channel ID to watch. Can be an ID or an @Handle",
    required: true,
}

const DEFAULT_EVENT_OPTIONS: Omit<StringOption, "type"> = {
    name: "event",
    description: "Which event to listen for.",
    choices: [
        { name: "Upload", value: "upload" },
        { name: "Live", value: "live" },
        { name: "Upcoming", value: "upcoming" },
        { name: "Offline", value: "offline" },
        { name: "Post", value: "post" },
    ],
    required: true,
}

const TEMP_THREAD_OPTION: Omit<BooleanOption, "type"> = {
    name: "use_temp_thread",
    description: "Execute this command in a temporary thread instead of a regular channel.",
    required: false,
}

const FOR_CHANNEL_OPTION: Omit<ChannelOption, "type"> = {
    name: "for_channel",
    description: "Channel to execute this action in. If not provided, defaults to this channel.",
    channel_types: TEXT_CHANNEL_TYPES,
}

@SlashCommand({
    name: "action",
    description: "Manage this server's actions!",
    subcommandGroups: [
        {
            name: "create",
            description: "Create a new action for this guild. For advanced users!"
        }
    ]
})
export class ActionCommand {
    constructor(
        @InjectRepository(ActionDescriptor) private readonly actions: Repository<ActionDescriptor>
    ) {}

    @Command({name: "remove", description: "Remove one or multiple actions"})
    async remove(
        @String({name: "id", description: "ID of the action to remove. Can be a comma-separated list of IDs as well.", required: true}) id: string,
        @Interaction() {guildId}: ChatInputCommandInteraction,
    ) {
        const ids = id.split(",").map(id => id.trim());

        const removed = await this.actions.delete({
            id: In(ids),
            guildId
        }); 

        let description = `Attempted to remove ${ids.length} actions: \n${ids.map(id => `- \`${id}\``).join("\n")}`;

        const reply = new EmbedBuilder();

        if (removed.affected && removed.affected < ids.length) {
            description += `\n\n Ignored ${ids.length - removed.affected} actions that are not in this guild.`;
            reply.setColor(Colors.Red);    
        } else {
            reply.setColor(Colors.Green);
        }

        return reply
            .setDescription(description);
    }

    private async createAction(option: DeepPartial<ActionDescriptor>): Promise<EmbedBuilder> {
        await this.actions.insert(option);
        return new EmbedBuilder();
    }

    @Command({group: "create", name: "lock", description: "Locks or unlocks a channel."})
    async createLock(
        @String(PLATFORM_OPTIONS) platform: Platform,
        @String(CHANNELID_OPTIONS) channelId: string,
        @String(DEFAULT_EVENT_OPTIONS) onEvent: Event,
        @Interaction() {guildId, channelId: discordChannelId}: ChatInputCommandInteraction,
        @String({name: "mode", description: "Whether to lock or unlock when receiving this option.", choices: [{name: "Lock", value: "lock"}, {name: "Unlock", value: "unlock"}], required: true}) mode: "lock" | "unlock",
        @String({name: "message", description: `Message to send. Defaults to "Channel locked."/"Channel unlocked."`}) message: string,
        @Channel(FOR_CHANNEL_OPTION) forChannel?: DiscordChannel,
    ) {
        return this.createAction({type: "lock", platform, channelId, onEvent, guildId, discordChannelId: forChannel?.id ?? discordChannelId, data: {mode, message}});
    }

    @Command({group: "create", name: "rename", description: "Renames a channel."})
    async createRename(
        @String(PLATFORM_OPTIONS) platform: Platform,
        @String(CHANNELID_OPTIONS) channelId: string,
        @String(DEFAULT_EVENT_OPTIONS) onEvent: Event,
        @Interaction() {guildId}: ChatInputCommandInteraction,
        @String({name: "name", description: "The channel's new name.", required: true}) name: string,
        @Channel(FOR_CHANNEL_OPTION) forChannel?: DiscordChannel,
    ) {
        return this.createAction({type: "rename", platform, channelId, onEvent, guildId, data: {name}});
    }

    @Command({group: "create", name: "echo", description: "Sends a message"})
    async createEcho(
        @String(PLATFORM_OPTIONS) platform: Platform,
        @String(CHANNELID_OPTIONS) channelId: string,
        @String(DEFAULT_EVENT_OPTIONS) onEvent: Event,
        @Interaction() {guildId, channelId: discordChannelId}: ChatInputCommandInteraction,
        @String({name: "message", description: "Message to send. Supports {interpolation} of certain values.", required: true}) message: string,
        @Channel(FOR_CHANNEL_OPTION) forChannel?: DiscordChannel,
    ) {
        return this.createAction({type: "echo", platform, channelId, onEvent, guildId, discordChannelId: forChannel?.id ?? discordChannelId, data: {message}});
    }

    @Command({group: "create", name: "notify", description: "Sends a notification. Like Echo, but generated embeds for certain platforms."})
    async createNotify(
        @String(PLATFORM_OPTIONS) platform: Platform,
        @String(CHANNELID_OPTIONS) channelId: string,
        @String(DEFAULT_EVENT_OPTIONS) onEvent: Event,
        @Interaction() {guildId, channelId: discordChannelId}: ChatInputCommandInteraction,
        @String({name: "message", description: "Message to send. Supports {interpolation} of certain values."}) message: string, 
        @Channel(FOR_CHANNEL_OPTION) forChannel?: DiscordChannel,
    ) {
        return this.createAction({type: "notify", platform, channelId, onEvent, guildId, discordChannelId: forChannel?.id ?? discordChannelId, data: {message}});
    }

    @Command({group: "create", name: "thread", description: "Creates a temporary thread for this action."})
    async createThreadAction(
        @String(PLATFORM_OPTIONS) platform: Platform,
        @String(CHANNELID_OPTIONS) channelId: string,
        @String(DEFAULT_EVENT_OPTIONS) onEvent: Event,
        @Interaction() {guildId, channelId: discordChannelId}: ChatInputCommandInteraction,
        @String({name: "name", description: "The naming scheme for this channel. Supports {interpolation}. Defaults to stream name and time."}) name?: string,
        @String({name: "message", description: "Message to start the thread with. Supports {interpolation}."}) message?: string,
        @Channel(FOR_CHANNEL_OPTION) forChannel?: DiscordChannel,
    ) {
        return this.createAction({type: "thread", platform, channelId, onEvent, guildId, discordChannelId: forChannel?.id ?? discordChannelId, data: {name, message}});
    }
}