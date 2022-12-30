import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { FetchPostsCommand } from "./fetch-posts.command";
import { Logger } from "@nestjs/common";
import { YouTubeCommunityPostsRequestService } from "../community-posts.request.service";

@CommandHandler(FetchPostsCommand)
export class FetchPostsHandler implements ICommandHandler<FetchPostsCommand> {
    private readonly logger = new Logger(FetchPostsHandler.name);

    constructor(private readonly requestService: YouTubeCommunityPostsRequestService) {}

    async execute(options: FetchPostsCommand): Promise<any> {
        return this.requestService.fetchPosts(options);
    }
}
