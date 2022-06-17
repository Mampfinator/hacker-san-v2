import { GuildTextBasedChannel, MessageEmbed, NonThreadGuildBasedChannel, TextChannel, ThreadChannel } from "discord.js";
import { Action } from "./models/action.entity";
import { AttachmentType, ChannelInfo, CommunityPost, extractChannelInfo, extractCommunityPosts } from "yt-scraping-utilities";
import { ytInitialData } from "yt-scraping-utilities/dist/youtube-types";
import { DiscordClientService } from "./client/discord-client.service";

export namespace DiscordUtil {
    export function postsToEmbed(data?: ytInitialData): MessageEmbed[] {
        const posts = extractCommunityPosts(data);
        const channelInfo = extractChannelInfo(data);

        return posts.map(post => postToEmbed(post, channelInfo));
    }

    export function postToEmbed(post: CommunityPost, channelInfo: ChannelInfo): MessageEmbed {
        const {
            content,
            attachmentType,
            id: postId
        } = post;

        const {
            avatarUrl,
            name,
            id: channelId
        } = channelInfo;
        
        const embed = new MessageEmbed()
            .setAuthor({name, iconURL: avatarUrl, url: `https://www.youtube.com/channel/${channelId}`})

        if (content) embed
            .setDescription(content.map(({text, url}) => `${url? "[" : ""}${text}${url ? `](${url})` : ""}`).join(" "))
            .setURL(`https://youtube.com/post/${postId}`)
            .setColor("#ff0000")
            .setFooter({
                text: `ID: ${postId} | ${attachmentType == AttachmentType.None ? "text" : attachmentType.toLowerCase()}-post`
            })

        switch(attachmentType) {
            case AttachmentType.None:
                break;
            case AttachmentType.Image:
                embed.setImage(post.images![0]); break;
            case AttachmentType.Video:
                const {video} = post;
                embed.addField("Video", `${video.title}\n[Click here](https://youtube.com/watch?v=${video.id})`)
                embed.setImage(video.thumbnail);
                break;
            case AttachmentType.Playlist:
                const {playlist} = post;
                embed.description += `\n\nPlaylist: ${playlist.title} [link](https://youtube.com/playlist?list=${playlist.id})`
                embed.setImage(playlist.thumbail);
            case AttachmentType.Poll:
                const {choices} = post;
                embed.description += "\n\u200b\n\u200b";
                embed.addField("Poll", choices.map(choice => `\u2022 \u200b ${choice.text}`).join("\n"));
        }

        return embed;
    }

    export async function fetchChannelOrThread(action: Action, client: DiscordClientService): Promise<NonThreadGuildBasedChannel | ThreadChannel> {
        const channel = await client.channels.fetch(action.discordChannelId);
        return action.discordThreadId ? await (channel as TextChannel).threads.fetch(action.discordThreadId) : channel as NonThreadGuildBasedChannel;
    }
}