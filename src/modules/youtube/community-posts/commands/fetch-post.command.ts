import { ICommand } from "@nestjs/cqrs";
import { Util } from "../../../../shared/util/util";

export interface FetchPostCommandOptions {
    postId: string;
    /**
     * Whether to refetch this post even if it's in cache.
     */
    forceRefetch?: boolean;
    /**
     * Whether to include ChannelInfo in the result. Changes return type to `{posts: CommunityPost, channel: ChannelInfo}`.
     */
    includeChannel?: boolean;
}

/***
 * Fetches a single post by ID.
 */
export class FetchPostCommand implements ICommand, FetchPostCommandOptions {
    public readonly postId: string;
    public readonly forceRefetch: boolean = false;
    public readonly includeChannel?: boolean = false;

    constructor(options: FetchPostCommandOptions) {
        if (typeof options.postId !== "string")
            throw new TypeError(`Expected options.postId to be of type string, received ${typeof options.postId}.`);
        Util.assignIfDefined(this, options);
    }
}
