import { ICommand } from "@nestjs/cqrs";
import { CommunityPost } from "yt-scraping-utilities";
import { Util, RequireOnlyOne } from "../../../../shared/util/util";

export interface SyncPostsCommandOptions {
    /**
     * Channel ID to fetch posts for.
     */
    channelId?: string;
    /**
     * Posts to upsert into the database.
     */
    posts?: CommunityPost[];
}

/**
 * Sync new posts to the database.
 * Prevents message spam when a new channel is added.
 */
export class SyncPostsCommand implements ICommand, SyncPostsCommandOptions {
    public readonly channelId?: string;
    public readonly posts?: CommunityPost[];

    constructor(options: RequireOnlyOne<SyncPostsCommandOptions, "channelId" | "posts">) {
        if ((options.channelId && options.posts) || (!options.channelId && !options.posts))
            throw new TypeError("Either channelId or posts need to be provided for syncing.");

        Util.assignIfDefined(this, options);
    }
}
