import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SyncPostsCommand } from "./sync-posts.command";
import { tryFetchPosts } from "../../util";
import { InjectRepository } from "@nestjs/typeorm";
import { CommunityPost } from "../model/community-post.entity";
import { Repository } from "typeorm";

@CommandHandler(SyncPostsCommand)
export class SyncPostsHandler implements ICommandHandler<SyncPostsCommand> {
    constructor(
        @InjectRepository(CommunityPost)
        private readonly postRepo: Repository<CommunityPost>,
    ) {}

    async execute({ channelId, posts }: SyncPostsCommand) {
        if (!channelId && typeof posts !== "object")
            throw new TypeError(
                "Either channelId or posts needs to be defined.",
            );

        if (channelId && !posts) {
            posts = (await tryFetchPosts(channelId, 3, 500)).posts;
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
