import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CommunityPost as CommunityPostEntity } from "../model/community-post.entity";
import { FetchPostCommand } from "./fetch-post.command";
import { ChannelInfo, CommunityPost, extractChannelInfo, extractCommunityPosts } from "yt-scraping-utilities";
import axios from "axios";

@CommandHandler(FetchPostCommand)
export class FetchPostsHandler implements ICommandHandler<FetchPostCommand> {
    constructor(
        @InjectRepository(CommunityPostEntity) private readonly postRepo: Repository<CommunityPostEntity>,
    ) {}

    async execute({postId: id, includeChannelInfo}: FetchPostCommand): Promise<CommunityPost[] | {posts: CommunityPost[], channel: ChannelInfo}> {
        // TODO: cache results.
        const {data} = await axios.get(`https://youtube.com/post/${id}`);
        const posts = extractCommunityPosts(data);
        let channel = includeChannelInfo ? extractChannelInfo(data) : undefined;

        return includeChannelInfo ? {posts, channel} : posts;
    }
}