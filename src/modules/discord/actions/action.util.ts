import { EmbedBuilder } from "@discordjs/builders";
import { Colors } from "discord.js";
import { Platform } from "../../../constants";
import { Util } from "../../../util";
import { ActionDescriptor } from "../models/action.entity";
import { IActionPayload } from "./action.interfaces";

interface ActionOptions {
    payload: IActionPayload<any>;
    descriptor: ActionDescriptor;
}

export function interpolate(base: string, options: ActionOptions): string {
    const dict = makeDict(options);
    return Util.interpolate(base, dict);
}

const PLATFORM_DICT_MAKERS: Record<Exclude<Platform, "twitter">, (options: ActionOptions) => ActionDictionary> = {
    youtube: ({ payload: { channel, post, video }, descriptor }) => {
        const channelLink = `https://youtube.com/channel/${channel.platformId}`;
        const link = post
            ? `https://youtube.com/community/${post.platformId}`
            : `https://youtube.com/watch?v=${video.platformId}`;

        return {
            link,
            channelLink,
        };
    },
};

interface ActionDictionary extends Record<string, string> {
    /**
     * URL to the event.
     */
    link: string;
    /**
     * URL to the event's channel.
     */
    channelLink: string;
}

export function makeDict(options: ActionOptions): ActionDictionary {
    const {
        payload: {
            channel: { platform },
        },
    } = options;

    return PLATFORM_DICT_MAKERS[platform](options);
}

export function needsEmbed({ event, channel }: IActionPayload<any>): boolean {
    return event == "post" && channel.platform == "youtube";
}

export function generateEmbed(payload: IActionPayload<any>): EmbedBuilder {
    // TODO implement
    return new EmbedBuilder().setTitle("Work in Progress!").setColor(Colors.Red);
}
