import { ChannelType } from "discord.js";

export const TEXT_CHANNEL_TYPES: Exclude<ChannelType, ChannelType.DM | ChannelType.GroupDM>[] = [
    ChannelType.GuildText,
    ChannelType.PrivateThread,
    ChannelType.PublicThread,
    ChannelType.AnnouncementThread,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildVoice, // integrated voice text
]