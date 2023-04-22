import { DeepPartial } from "typeorm";
import { Platform } from "../../../../../constants";
import { ActionDescriptor } from "../../../models/action.entity";

export interface ActionBase {
    guildId: string;
    platform: Platform;
    channelId: string;
}

export interface MakeThreadOptions extends ActionBase {
    streamChannelId: string;
    streamChannelName: string;
    notifChannelId: string;
    liveMessage: string;
    uploadMessage: string;
    postMessage: string;
}

export const makeThreadActions = ({
    guildId,
    platform,
    channelId,
    streamChannelId,
    streamChannelName,
    notifChannelId,
    liveMessage,
    uploadMessage,
    postMessage,
}: MakeThreadOptions): DeepPartial<ActionDescriptor>[] => {
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
    ];
};

export interface GeneralActionsOptions extends ActionBase {
    pingRoleId?: string;
    talentName?: string;
    notifChannelId?: string;
    streamChannelId?: string;
    streamChannelName?: string;
    tagsChannelId?: string;
    tempThreads?: boolean;
}

export const makeGeneralActions = ({
    guildId,
    channelId,
    platform,
    pingRoleId,
    talentName,
    notifChannelId,
    streamChannelId,
    streamChannelName,
    tagsChannelId,
    tempThreads,
}: GeneralActionsOptions): DeepPartial<ActionDescriptor>[] => {
    const actions: DeepPartial<ActionDescriptor>[] = [];
    const base: ActionBase = { guildId, channelId, platform };

    if (notifChannelId) {
        // notif options (posts not included)
        actions.push(
            {
                ...base,
                onEvent: "live",
                type: "notify",
                discordChannelId: notifChannelId,
                data: {
                    message: `${pingRoleId ? `<@&${pingRoleId}>\n` : ""}${
                        talentName ? talentName : "{channelname}"
                    } is now live!\n{link}`,
                },
            },
            {
                ...base,
                onEvent: "upload",
                type: "notify",
                discordChannelId: notifChannelId,
                data: {
                    message: `${pingRoleId ? `<@&${pingRoleId}>\n` : ""}${
                        talentName ? talentName : "{channelname}"
                    } uploaded a new video!\n{link}`,
                },
            },
        );
    }

    if (streamChannelId) {
        // rename actions
        actions.push(
            {
                ...base,
                onEvent: "live",
                type: "rename",
                discordChannelId: streamChannelId,
                data: {
                    name: `🔴 ${streamChannelName}`,
                },
            },
            {
                ...base,
                onEvent: "offline",
                type: "rename",
                discordChannelId: streamChannelId,
                data: {
                    name: `⚫ ${streamChannelName}`,
                },
            },
        );

        // temp thread action
        if (tempThreads)
            actions.push({
                ...base,
                onEvent: "live",
                type: "thread",
                discordChannelId: streamChannelId,
                data: {
                    message: "!stream {link}",
                },
            });
        else
            actions.push({
                ...base,
                onEvent: "live",
                type: "echo",
                discordChannelId: streamChannelId,
                data: {
                    message: "!stream {link}",
                },
            });
    }

    if (tagsChannelId || tempThreads) {
        actions.push({
            ...base,
            onEvent: "offline",
            type: "echo",
            discordChannelId: tempThreads ? "TEMP_THREAD" : tagsChannelId,
            data: {
                message: "!tags {link}",
            },
        });
    }

    return actions;
};
