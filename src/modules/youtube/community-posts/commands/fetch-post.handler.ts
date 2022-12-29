import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CacheCollection } from "../../../../shared/util/cache-collection";
import { YouTubeCommunityPostsRequestService } from "../community-posts.request.service";
import { FetchPostCommand } from "./fetch-post.command";

@CommandHandler(FetchPostCommand)
export class FetchPostHandler implements ICommandHandler<FetchPostCommand> {
    private readonly cache = new CacheCollection({
        ttl: 600000 // 10 minutes,
    })

    constructor(
        private readonly requestService: YouTubeCommunityPostsRequestService,
    ) {}
    
    async execute({postId, forceRefetch}: FetchPostCommand): Promise<any> {
        if (!forceRefetch && this.cache.has(postId)) return this.cache.get(postId);
        return await this.requestService.fetchPostById(postId);

    }
}