import { ICommand } from "@nestjs/cqrs";
import { Util } from "../../../../util";

export interface FetchPostCommandOptions {
    postId: string;
    forceRefetch?: boolean;
    includeChannel?: boolean;
}

export class FetchPostCommand implements ICommand, FetchPostCommandOptions {
    public readonly postId: string;
    public readonly forceRefetch: boolean = false;
    public readonly includeChannel?: boolean = false;

    constructor(options: FetchPostCommandOptions) {
        if (typeof options.postId !== "string")
            throw new TypeError(
                `Expected options.postId to be of type string, received ${typeof options.postId}.`,
            );
        Util.assignIfDefined(this, options);
    }
}
