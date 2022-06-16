import { ICommand } from "@nestjs/cqrs";
import { CommunityPost } from "yt-scraping-utilities";

/**
 * Sync new posts to the database.
 * Prevents message spam when a new channel is added.
 */
export class SyncPostsCommand implements ICommand {
    constructor(
        public readonly channelId?: string,
        public readonly posts?: CommunityPost[]
    ) {}
}