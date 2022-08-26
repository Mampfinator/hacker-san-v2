import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Repository } from "typeorm";
import { CommunityPost as CommunityPostEntity } from "../model/community-post.entity";
import { FetchPostsCommand } from "./fetch-posts.command";
import {
    ChannelInfo,
    CommunityPost,
    extractChannelInfo,
    extractCommunityPosts,
} from "yt-scraping-utilities";
import { YouTubeService } from "../../youtube.service";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@CommandHandler(FetchPostsCommand)
export class FetchPostsHandler implements ICommandHandler<FetchPostsCommand> {
    private readonly logger = new Logger(FetchPostsHandler.name);

    constructor(
        private readonly youtubeService: YouTubeService,
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
        const data = await this.youtubeService.fetchRaw(
            postId
                ? this.makePostLink(postId)
                : this.makeCommunityLink(channelId),
            {
                maxRetries: 3,
                requeuePriority: "high",
            },
        );

        const posts = extractCommunityPosts(data);
        const channel = includeChannelInfo
            ? extractChannelInfo(data)
            : undefined;

        return includeChannelInfo ? { posts, channel } : posts;
    }

    private makeCommunityLink(channelId: string) {
        return `https://youtube.com/channel/${channelId}/community`;
    }

    private makePostLink(postId: string) {
        return `https://youtube.com/post/${postId}`;
    }
}
