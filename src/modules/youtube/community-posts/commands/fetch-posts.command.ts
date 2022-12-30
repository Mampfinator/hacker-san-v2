import { ICommand } from "@nestjs/cqrs";
import { Util } from "../../../../util";

export interface FetchPostsCommandOptions {
    channelId: string;
    includeChannelInfo?: boolean;
    /**
     * Whether to fetch all posts or only the most recent ones.
     */
    fetchAll?: boolean;
}

export class FetchPostsCommand implements ICommand, FetchPostsCommandOptions {
    public readonly channelId: string;
    public readonly includeChannelInfo = false;
    public readonly fetchAll = false;

    constructor(options: FetchPostsCommandOptions) {
        if (typeof options.channelId !== "string")
            throw new TypeError(
                `Expected options.channelId to be of type string, received ${typeof options.channelId}.`,
            );
        Util.assignIfDefined(this, options);
    }
}
