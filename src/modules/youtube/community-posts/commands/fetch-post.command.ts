import { ICommand } from "@nestjs/cqrs";

export class FetchPostCommand implements ICommand {
    constructor(
        public readonly postId: string,
        public readonly includeChannelInfo?: boolean,
    ) {}
}
