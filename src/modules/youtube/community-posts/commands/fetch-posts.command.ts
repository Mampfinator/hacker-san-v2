import { Command } from "@nestjs-architects/typed-cqrs";
import { ChannelInfo, CommunityPost } from "yt-scraping-utilities";
import { Util } from "../../../../util";

export interface FetchPostsCommandOptions<C extends boolean> {
    channelId: string;
    /**
     * Whether to include ChannelInfo in the result. Changes return type to `{posts: CommunityPost[], channel: ChannelInfo}`.
     */
    includeChannelInfo?: C;
    /**
     * Whether to fetch all posts or only the most recent ones.
     */
    fetchAll?: boolean;
}

export class FetchPostsCommand<C extends boolean = false>
    extends Command<C extends true ? { channel: ChannelInfo; posts: CommunityPost[] } : CommunityPost[]>
    implements FetchPostsCommandOptions<C>
{
    public readonly channelId: string;
    public readonly includeChannelInfo: C;
    public readonly fetchAll: boolean = false;

    constructor(options: FetchPostsCommandOptions<C>) {
        super();
        Util.assignIfDefined(this, options );
    }
}
