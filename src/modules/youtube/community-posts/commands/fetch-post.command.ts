import { ICommand } from "@nestjs/cqrs";

export interface FetchPostCommandOptions {
    includeChannelInfo?: boolean;
    force?: boolean;
}

export class FetchPostCommand implements ICommand {
    public readonly includeChannelInfo?: boolean;
    public readonly force?: boolean;

    constructor(
        public readonly postId: string,
        options: FetchPostCommandOptions = {},
    ) {
        this.includeChannelInfo = options.includeChannelInfo;
        this.force = options.force;
    }
}
