import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CommunityPost as CommunityPostEntity } from "../model/community-post.entity";
import { FetchPostsCommand } from "./fetch-post.command";
import {
    ChannelInfo,
    CommunityPost,
    extractChannelInfo,
    extractCommunityPosts,
} from "yt-scraping-utilities";
import axios from "axios";
import { CacheCollection } from "src/shared/util/cache-collection";

@CommandHandler(FetchPostsCommand)
export class FetchPostsHandler implements ICommandHandler<FetchPostsCommand> {
    constructor(
        @InjectRepository(CommunityPostEntity)
        private readonly postRepo: Repository<CommunityPostEntity>,
    ) {}

    async execute({
        postId,
        channelId,
        includeChannelInfo,
        force,
    }: FetchPostsCommand): Promise<
        CommunityPost[] | { posts: CommunityPost[]; channel: ChannelInfo }
    > {
        let data: string;

        if (postId) {
            data = await this.fetchPostPage(postId);
        } else if (channelId) {
            data = await this.fetchCommunityPage(channelId);
        }

        const posts = extractCommunityPosts(data);
        const channel = includeChannelInfo
            ? extractChannelInfo(data)
            : undefined;

        return includeChannelInfo ? { posts, channel } : posts;
    }

    async fetchCommunityPage(channelId: string): Promise<string> {
        const { data } = await axios.get(
            `https://youtube.com/channel/${channelId}/community`,
        );
        return data;
    }

    async fetchPostPage(postId: string): Promise<string> {
        const { data } = await axios.get(`https://youtube.com/post/${postId}`);
        return data;
    }
}
