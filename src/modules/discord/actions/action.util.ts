import { EmbedBuilder } from "@discordjs/builders";
import { Colors } from "discord.js";
import { Platform } from "../../../constants";
import { Util } from "../../../shared/util/util";
import { CommunityPostEntity } from "../../platforms/models/post.entity";
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


interface ActionDictionary extends Record<string, string> {
    /**
     * URL to the event.
     */
    link: string;
    /**
     * URL to the event's channel.
     */
    channelLink: string;

    /**
     * Title of the event. Only present if event target is a video.
     */
    title: string;

    /**
     * Date of the event in dd/mm/yyyy.
     */
    date: string;
}


const PLATFORM_DICT_MAKERS: Record<Exclude<Platform, "twitter">, (options: ActionOptions) => ActionDictionary> = {
    youtube: ({ payload: { channel, post, video }, descriptor }) => {
        const channelLink = `https://youtube.com/channel/${channel.platformId}`;
        const link = post
            ? `https://youtube.com/community/${post.platformId}`
            : `https://youtube.com/watch?v=${video.platformId}`;

        const now = new Date();
        

        return {
            link,
            channelLink,
            title: video?.title,
            date: `${now.getUTCDate()}/${now.getUTCMonth()}/${now.getUTCFullYear()}`,
        };
    },
};


export function makeDict(options: ActionOptions): ActionDictionary {
    const {
        payload: {
            channel: { platform },
        },
    } = options;

    return PLATFORM_DICT_MAKERS[platform](options);
}

export function needsEmbed({ event, channel }: IActionPayload): boolean {
    return event == "post" && channel.platform == "youtube";
}

export function generateEmbed({ channel, post, video, event }: IActionPayload): EmbedBuilder {
    if (channel.platform === "youtube" && event === "post") {
        // TODO needs fixing for video & playlist posts.
        post = post as CommunityPostEntity;

        const embed = new EmbedBuilder().setColor([255, 0, 0]).setAuthor({
            name: channel.name,
            url: `https://youtube.com/channel/${channel.platformId}`,
            iconURL: channel.avatarUrl,
        });

        let description: string = "";
        if (post.content) {
            description += post.content
                .map(({ text, url }) => {
                    if (url) return `[${text}](${url})`;
                    return text;
                })
                .join(" ");
        }
        let footerText = "";

        if (post.images && post.images.length > 0) {
            embed.setImage(post.images[0]);
            if (post.images.length > 1) {
                footerText += "Has additional images!";
            }
        }

        if (post.poll) {
            if (description.length > 0) description += "\n\u200b\n\u200b"; // put some space between main content and the poll

            embed.addFields({
                name: "Poll",
                value: post.poll.map(choice => `\u2022 \u200b ${choice}`).join("\n"),
            });
        }

        if (description) embed.setDescription(description);

        embed.setFooter({ text: footerText + `ID: ${post.platformId}` });

        return embed;
    }
}
