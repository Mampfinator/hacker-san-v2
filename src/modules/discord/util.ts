import {
    AutocompleteInteraction,
    Channel,
    MessageEmbed,
    NonThreadGuildBasedChannel,
    TextChannel,
    ThreadChannel,
} from "discord.js";
import { Action } from "./models/action.entity";
import { PALTFORM_NAME_LOOKUP, Platform, SUPPORTED_PLATFORMS } from "src/constants";
import {
    AttachmentType,
    ChannelInfo,
    CommunityPost,
    extractChannelInfo,
    extractCommunityPosts,
} from "yt-scraping-utilities";
import { ytInitialData } from "yt-scraping-utilities/dist/youtube-types";
import { DiscordClientService } from "./client/discord-client.service";
import { SlashCommandStringOption } from "@discordjs/builders";
import { QueryBus } from "@nestjs/cqrs";
import { ChannelsQuery } from "../platforms/queries/channels.query";
import { ChannelsQueryResult } from "../platforms/queries/channels.handler";

export namespace DiscordUtil {
    export function postsToEmbed(data?: ytInitialData): MessageEmbed[] {
        const posts = extractCommunityPosts(data);
        const channelInfo = extractChannelInfo(data);

        return posts.map(post => postToEmbed(post, channelInfo));
    }

    export function postToEmbed(
        post: CommunityPost,
        channelInfo: Partial<ChannelInfo>,
    ): MessageEmbed {
        const { content, attachmentType, id: postId } = post;

        const { avatarUrl, name, id: channelId } = channelInfo;

        const embed = new MessageEmbed().setAuthor({
            name,
            iconURL: avatarUrl,
            url: `https://www.youtube.com/channel/${channelId}`,
        });

        if (content)
            embed
                .setDescription(
                    content
                        .map(
                            ({ text, url }) =>
                                `${url ? "[" : ""}${text}${
                                    url ? `](${url})` : ""
                                }`,
                        )
                        .join(" "),
                )
                .setURL(`https://youtube.com/post/${postId}`)
                .setColor("#ff0000")
                .setFooter({
                    text: `ID: ${postId} | ${
                        attachmentType == AttachmentType.None
                            ? "text"
                            : attachmentType.toLowerCase()
                    }-post`,
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
                embed.addField(
                    "Video",
                    `${video.title}\n[Click here](https://youtube.com/watch?v=${video.id})`,
                );
                embed.setImage(video.thumbnail);
                break;
            case AttachmentType.Playlist:
                const { playlist } = post;
                embed.description += `\n\nPlaylist: ${playlist.title} [link](https://youtube.com/playlist?list=${playlist.id})`;
                embed.setImage(playlist.thumbail);
            case AttachmentType.Poll:
                const { choices } = post;
                embed.description += "\n\u200b\n\u200b";
                embed.addField(
                    "Poll",
                    choices
                        .map(choice => `\u2022 \u200b ${choice.text}`)
                        .join("\n"),
                );
        }

        return embed;
    }

    export async function fetchChannelOrThread(
        action: Action,
        client: DiscordClientService,
    ): Promise<NonThreadGuildBasedChannel | ThreadChannel> {
        const channel = await client.channels.fetch(action.discordChannelId);
        return action.discordThreadId
            ? await (channel as TextChannel).threads.fetch(
                  action.discordThreadId,
              )
            : (channel as NonThreadGuildBasedChannel);
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

    export function makePlatformOption(
        builder: SlashCommandStringOption,
        description?: string,
    ) {

        const choices = SUPPORTED_PLATFORMS.map(platform => ({ name: PALTFORM_NAME_LOOKUP[platform], value: platform }));

        return builder
            .setName("platform")
            .setDescription(description ?? "The platform.")
            .setChoices(...choices);
    }

    export async function handleChannelAutocomplete(
        { options }: AutocompleteInteraction,
        queryBus: QueryBus,
    ) {
        const platform = options.getString("platform", false) as
            | Platform
            | undefined;
        if (!platform) return [];

        const input = (options.getFocused() as string).trim();

        const { channels } = await queryBus.execute<
            ChannelsQuery,
            ChannelsQueryResult
        >(new ChannelsQuery(platform));

        //? TODO: find an SQL only option.
        return channels
            .filter(
                channel =>
                    channel.name.includes(input) || channel.id.includes(input),
            )
            .map(channel => ({ name: channel.name, value: channel.id }))
            .slice(0, 25); // limit to 25 results because Discord has a limit of 25 autocomplete suggestions.
    }
}
