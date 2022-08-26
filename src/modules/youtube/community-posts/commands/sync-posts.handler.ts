import { CommandBus, CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SyncPostsCommand } from "./sync-posts.command";
import { CommunityPost } from "../model/community-post.entity";
import { Repository } from "typeorm";
import { FetchPostsCommand } from "./fetch-posts.command";
import { InjectRepository } from "@nestjs/typeorm";

@CommandHandler(SyncPostsCommand)
export class SyncPostsHandler implements ICommandHandler<SyncPostsCommand> {
    constructor(
        @InjectRepository(CommunityPost)
        private readonly postRepo: Repository<CommunityPost>,
        private readonly commandBus: CommandBus,
    ) {}

    async execute({ channelId, posts }: SyncPostsCommand) {
        if (!channelId && typeof posts !== "object")
            throw new TypeError(
                "Either channelId or posts needs to be defined.",
            );

        if (channelId && !posts) {
            posts = await this.commandBus.execute(
                new FetchPostsCommand({ channelId }),
            );
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
