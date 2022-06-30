import { ICommand } from "@nestjs/cqrs";

export interface FetchPostCommandOptions {
    includeChannelInfo?: boolean;
    force?: boolean;
    postId?: string;
    channelId?: string;
}

export class FetchPostsCommand implements ICommand {
    public readonly includeChannelInfo?: boolean;
    public readonly force?: boolean;
    public readonly postId?: string;
    public readonly channelId?: string;

    constructor(
        options: FetchPostCommandOptions = {},
    ) {
        if (options.channelId && options.postId) throw new Error("Cannot specify both channelId and postId.");

        Object.assign(this, options);
    }
}
