import { DeepPartial } from "typeorm";
import { Platform } from "../../../../../constants";
import { ActionDescriptor } from "../../../models/action.entity";

export interface MakeThreadOptions {
    guildId: string;
    platform: Platform;
    channelId: string;
    streamChannelId: string;
    streamChannelName: string;
    notifChannelId: string;
    liveMessage: string;
    uploadMessage: string;
    postMessage: string;
}

export const makeThreadActions = ({guildId, platform, channelId, streamChannelId, streamChannelName, notifChannelId, liveMessage, uploadMessage, postMessage}: MakeThreadOptions): DeepPartial<ActionDescriptor>[] => {
    const base = { guildId, platform, channelId };


    return [
        {
            ...base,
            type: "thread", // THIS IS MEANT FOR A FUTURE FEATURE THAT'LL BE IMPLEMENTED BEFORE NEXT RELEASE
            onEvent: "live",
            discordChannelId: streamChannelId,
            data: {
                name: "{title} - {date}",
                message: "{link}",
            },
        },
        {
            ...base,
            type: "echo",
            onEvent: "offline",
            discordChannelId: "TEMP_THREAD", // SEE COMMENT ABOVE
            data: {
                message: "!tags {link}",
            },
        },
        {
            ...base,
            type: "rename",
            onEvent: "live",
            discordChannelId: streamChannelId,
            data: {
                name: `🔴-${streamChannelName}`,
            },
        },
        {
            ...base,
            type: "rename",
            onEvent: "offline",
            discordChannelId: streamChannelId,
            data: {
                name: `⚫-${streamChannelName}`,
            },
        },
        /**
         * Notification actions
         */
        {
            ...base,
            type: "notify",
            onEvent: "live",
            discordChannelId: notifChannelId,
            data: {
                message: liveMessage,
            },
        },
        {
            ...base,
            type: "notify",
            onEvent: "upload",
            discordChannelId: notifChannelId,
            data: {
                message: uploadMessage,
            },
        },
        {
            ...base,
            type: "notify",
            onEvent: "post",
            discordChannelId: notifChannelId,
            data: {
                message: postMessage,
            },
        },
    ]
}