import { IQuery } from "@nestjs/cqrs";
import { Platform } from "src/constants";

export class ChannelsQuery implements IQuery {
    constructor(public readonly platform: Platform) {}
}
