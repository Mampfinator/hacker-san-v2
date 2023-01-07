import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { SyncPostsCommand } from "./sync-posts.command";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Logger } from "@nestjs/common";
import { YouTubeCommunityPostsRequestService } from "../community-posts.request.service";
import { CacheChannelInfoCommand } from "../../commands";
import { YouTubeCommunityPostsService } from "../youtube-community-posts.service";
import { InsertPostsQuery } from "../../../platforms/queries";

@CommandHandler(SyncPostsCommand)
export class SyncPostsHandler implements ICommandHandler<SyncPostsCommand> {
    private readonly logger = new Logger(SyncPostsHandler.name);

    constructor(
        private readonly requestService: YouTubeCommunityPostsRequestService,
        private readonly postsService: YouTubeCommunityPostsService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    async execute({ channelId, posts = [] }: SyncPostsCommand = {}) {
        if (channelId) {
            const {posts: morePosts, channel} =  await this.requestService.fetchPosts({channelId, includeChannelInfo: true});

            await this.commandBus.execute(new CacheChannelInfoCommand(channel));
        }

        await (this.queryBus.execute(new InsertPostsQuery(
            posts.map(post => this.postsService.postToEntity(post))
        )));
    }
}
