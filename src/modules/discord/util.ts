import {
    AutocompleteInteraction,
    Channel,
    DiscordAPIError,
    EmbedBuilder,
    NonThreadGuildBasedChannel,
    TextChannel,
    ThreadChannel,
    SlashCommandStringOption,
} from "discord.js";
import { ActionDescriptor } from "./models/action.entity";
import { PLATFORM_NAME_LOOKUP, Platform, SUPPORTED_PLATFORMS, EVENT_NAME_LOOKUP } from "../../constants";
import {
    AttachmentType,
    ChannelInfo,
    CommunityPost,
    extractChannelInfo,
    extractCommunityPosts,
} from "yt-scraping-utilities";
import { ytInitialData } from "yt-scraping-utilities/dist/youtube-types";
import { DiscordClientService } from "./discord-client.service";
import { QueryBus } from "@nestjs/cqrs";
import { getActions, getActionType } from "./actions/decorators/action";
import { Util } from "../../shared/util/util";
import { Body, Logger } from "@nestjs/common";
import { DiscordRESTService } from "./discord-rest.service";
import { Routes } from "discord-api-types/v10";
import { DiscordAPIError as DiscordAPIRESTError } from "@discordjs/rest";
import { FindChannelQuery } from "../platforms/queries";
import { ILike } from "typeorm";

export namespace DiscordUtil {
    export function postsToEmbed(data?: ytInitialData): EmbedBuilder[] {
        const posts = extractCommunityPosts(data);
        const channelInfo = extractChannelInfo(data);

        return posts.map(post => postToEmbed(post, channelInfo));
    }

    export function postToEmbed(post: CommunityPost, channelInfo: Partial<ChannelInfo>): EmbedBuilder {
        const { content, attachmentType, id: postId } = post;

        const { avatarUrl, name, id: channelId } = channelInfo;

        const embed = new EmbedBuilder().setAuthor({
            name,
            iconURL: avatarUrl,
            url: `https://www.youtube.com/channel/${channelId}`,
        });

        let embedContent: string;

        if (content)
            embedContent = content
                .map(({ text, url }) => `${url ? "[" : ""}${text}${url ? `](${url})` : ""}`)
                .join(" ");

        embed
            .setURL(`https://youtube.com/post/${postId}`)
            .setColor("#ff0000")
            .setFooter({
                text: `ID: ${postId}`,
            });

        switch (attachmentType) {
            case AttachmentType.None:
                break;
            case AttachmentType.Image:
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                embed.setImage(post.images![0]);
                break;
            case AttachmentType.Video:
                const { video } = post;
                embed.addFields({
                    name: "Video",
                    value: `${video.title}\n[Click here](https://youtube.com/watch?v=${video.id})`,
                });
                embed.setImage(video.thumbnail);
                break;
            case AttachmentType.Playlist:
                const { playlist } = post;
                embedContent += `\n\nPlaylist: ${playlist.title} [link](https://youtube.com/playlist?list=${playlist.id})`;
                embed.setImage(playlist.thumbail);
                break;
            case AttachmentType.Poll:
                const { choices } = post;
                embedContent += "\n\u200b\n\u200b";
                embed.addFields({
                    name: "Poll",
                    value: choices.map(choice => `\u2022 \u200b ${choice.text}`).join("\n"),
                });
        }
        embed.setDescription(embedContent);

        return embed;
    }

    export async function fetchChannelOrThread(
        action: ActionDescriptor,
        client: DiscordClientService,
    ): Promise<Channel> {
        const channel = await client.channels.fetch(action.discordChannelId);

        const final = action.discordThreadId
            ? await (channel as TextChannel).threads.fetch(action.discordThreadId)
            : (channel as NonThreadGuildBasedChannel);

        return final;
    }

    export async function fetchChannelOrThreadUncached(action: ActionDescriptor, rest: DiscordRESTService) {
        const channel = (await rest.get(Routes.channel(action.discordChannelId))) as NonThreadGuildBasedChannel;
        if (!action.discordThreadId) return channel;
        const threads = (await rest.get(Routes.threads(action.discordChannelId))) as ThreadChannel[];
        return threads.find(thread => thread.id === action.discordThreadId);
    }

    export function getChannelIds(channel: Channel): {
        discordChannelId: string;
        discordThreadId: string | null;
    } {
        if (channel.isThread()) {
            return {
                discordThreadId: channel.id,
                discordChannelId: channel.parentId,
            };
        } else {
            return {
                discordThreadId: null,
                discordChannelId: channel.id,
            };
        }
    }

    export function makePlatformOption(builder: SlashCommandStringOption, description?: string) {
        const choices = SUPPORTED_PLATFORMS.map(platform => ({
            name: PLATFORM_NAME_LOOKUP[platform],
            value: platform,
        }));

        return builder
            .setName("platform")
            .setDescription(description ?? "The platform.")
            .setChoices(...choices);
    }

    export function makeEventOption(builder: SlashCommandStringOption, description?: string) {
        const choices = Object.keys(EVENT_NAME_LOOKUP).map(event => ({
            name: EVENT_NAME_LOOKUP[event],
            value: event,
        }));

        return builder
            .setName("event")
            .setDescription(description ?? "The event.")
            .setChoices(...choices);
    }

    export function makeActionTypeOption(builder: SlashCommandStringOption, description?: string) {
        const choices = getActions().map(action => {
            const type = getActionType(action);

            return { value: type, name: Util.firstUpperCase(type) };
        });

        return builder
            .setName("type")
            .setDescription(description ?? "The action type.")
            .setChoices(...choices);
    }

    export async function handleChannelAutocomplete({ options }: AutocompleteInteraction, queryBus: QueryBus) {
        const platform = options.getString("platform", false) as Platform | undefined;
        if (!platform) return [];

        const input = (options.getFocused() as string).trim().toLowerCase();

        const channels = await queryBus.execute(
            new FindChannelQuery({ one: false })
                .where({ name: ILike(input) })
                .where({ userName: ILike(input) })
                .where({ id: ILike(input) })
                .take(25),
        );

        return channels.map(channel => ({
            name: channel.name,
            value: channel.platformId,
        }));
    }
}

export function discordAPIError(error: any) {
    if (error.prototype && (error instanceof DiscordAPIError || error instanceof DiscordAPIRESTError)) return true;
}

const ignoreLogger = new Logger("IgnoreLogger");

export async function ignoreDiscordAPIErrors(error: any) {
    await Util.ignore(error, discordAPIError);
    ignoreLogger.warn(error);
}

export enum HammertimeFlag {
    FullTime = "T",
    Remaining = "R",
}

export function toHammertime(date: Date, flag?: HammertimeFlag): string {
    const timestamp = Math.floor(Number(date) / 1000);
    return `<t:${timestamp}${flag ? `:${flag}` : ""}>`;
}

export const PLATFORM_CHOICES: { name: string; value: Platform }[] = [
    { name: "YouTube", value: "youtube" },
    { name: "Twitter", value: "twitter" },
];
