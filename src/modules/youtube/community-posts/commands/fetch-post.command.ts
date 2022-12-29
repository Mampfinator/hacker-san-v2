import { ICommand } from "@nestjs/cqrs";

export interface FetchPostCommandOptions {
    postId: string;
    forceRefetch?: boolean;
}

const DEFAULT_OPTIONS: Omit<FetchPostCommandOptions, "postId"> = {
    forceRefetch: false,
}

export class FetchPostCommand implements ICommand, FetchPostCommandOptions {
    public readonly postId: string;
    public readonly forceRefetch: boolean;
    
    constructor(options: FetchPostCommandOptions) {
        if (typeof options.postId !== "string") throw new TypeError(`Expected options.postId to be of type string, received ${typeof options.postId}.`);
        Object.assign(this, {...DEFAULT_OPTIONS, ...options});
    }
}