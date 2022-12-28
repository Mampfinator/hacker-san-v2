import { IQuery } from "@nestjs/cqrs";
import { Platform } from "../../../constants";

export class ChannelsQuery implements IQuery {
    constructor(public readonly platform: Platform) {}
}
