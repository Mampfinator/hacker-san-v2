import { IQuery } from "@nestjs/cqrs";
import { Platform } from "src/modules/discord/models/action.entity";

export class ChannelsQuery implements IQuery {
    constructor(public readonly platform: Platform) {}
}
