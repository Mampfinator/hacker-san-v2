import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SyncPostsCommand } from "./sync-posts.command";
import { CommunityPost as CommunityPostEntity } from "../model/community-post.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Logger } from "@nestjs/common";
import { YouTubeCommunityPostsRequestService } from "../community-posts.request.service";

@CommandHandler(SyncPostsCommand)
export class SyncPostsHandler implements ICommandHandler<SyncPostsCommand> {
    private readonly logger = new Logger(SyncPostsHandler.name);

    constructor(
        @InjectRepository(CommunityPostEntity)
        private readonly postRepo: Repository<CommunityPostEntity>,
        private readonly requestService: YouTubeCommunityPostsRequestService,
    ) {}

    async execute({ channelId, posts = [] }: SyncPostsCommand = {}) {
        if (channelId) {
            posts = await this.requestService.fetchPosts({
                channelId,
                fetchAll: true,
                includeChannelInfo: false,
            });
        }

        for (const post of posts) {
            await this.postRepo.upsert(
                {
                    id: post.id,
                },
                ["id"],
            );
        }
    }
}
