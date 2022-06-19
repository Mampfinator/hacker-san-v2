import { ICommand } from "@nestjs/cqrs";
import { TwitterSpaceStatus } from "../models/twitter-space.entity";
import { In } from "typeorm";

export class GetSpacesRequest implements ICommand {
    constructor(
        public readonly filter: Partial<{
            channelId: string | ReturnType<typeof In>;
            status: TwitterSpaceStatus | ReturnType<typeof In>;
        }>,
    ) {}
}
