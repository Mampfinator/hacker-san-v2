import { ICommand } from "@nestjs/cqrs";
import { CommunityPost } from "yt-scraping-utilities";

export interface SyncPostsCommandOptions {
    channelId?: string;
    posts?: CommunityPost[];
}

/**
 * Sync new posts to the database.
 * Prevents message spam when a new channel is added.
 */
export class SyncPostsCommand implements ICommand {
    public readonly channelId?: string;
    public readonly posts?: CommunityPost[];

    constructor(options: SyncPostsCommandOptions) {
        this.channelId = options.channelId;
        this.posts = options.posts;
    }
}
