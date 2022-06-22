import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CommunityPost as CommunityPostEntity } from "../model/community-post.entity";
import { FetchPostCommand } from "./fetch-post.command";
import {
    ChannelInfo,
    CommunityPost,
    extractChannelInfo,
    extractCommunityPosts,
} from "yt-scraping-utilities";
import axios from "axios";
import { CacheCollection } from "src/shared/util/cache-collection";

@CommandHandler(FetchPostCommand)
export class FetchPostsHandler implements ICommandHandler<FetchPostCommand> {
    private readonly cache = new CacheCollection<string, string>();

    constructor(
        @InjectRepository(CommunityPostEntity)
        private readonly postRepo: Repository<CommunityPostEntity>,
    ) {}

    async execute({
        postId: id,
        includeChannelInfo,
        force,
    }: FetchPostCommand): Promise<
        CommunityPost[] | { posts: CommunityPost[]; channel: ChannelInfo }
    > {
        let data: string;

        if (!force && this.cache.has(id)) data = this.cache.get(id);
        else data = (await axios.get(`https://youtube.com/post/${id}`)).data;

        const posts = extractCommunityPosts(data);
        const channel = includeChannelInfo
            ? extractChannelInfo(data)
            : undefined;

        return includeChannelInfo ? { posts, channel } : posts;
    }
}
