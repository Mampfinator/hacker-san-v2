import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CommunityPost } from "yt-scraping-utilities";
import { CacheCollection } from "../../../../shared/util/cache-collection";
import { YouTubeCommunityPostsRequestService } from "../community-posts.request.service";
import { FetchPostCommand } from "./fetch-post.command";

@CommandHandler(FetchPostCommand)
export class FetchPostHandler implements ICommandHandler<FetchPostCommand> {
    private readonly cache = new CacheCollection<string, CommunityPost>({
        ttl: 600000, // 10 minutes,
    });

    constructor(
        private readonly requestService: YouTubeCommunityPostsRequestService,
    ) {}

    async execute({
        postId,
        forceRefetch,
        includeChannel,
    }: FetchPostCommand): Promise<any> {
        if (!forceRefetch && this.cache.has(postId))
            return this.cache.get(postId);
        const result = await this.requestService.fetchSinglePost(
            postId,
            includeChannel,
        );

        // this is ugly, but it'll do.
        this.cache.set(
            postId,
            includeChannel
                ? (result as { post: CommunityPost }).post
                : (result as CommunityPost),
        );

        return result;
    }
}
