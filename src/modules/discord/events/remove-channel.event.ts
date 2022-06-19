import { IEvent } from "@nestjs/cqrs";
import { Action } from "../models/action.entity";

export class RemoveChannelEvent implements IEvent {
    constructor(
        public readonly platform: "YouTube" | "Twitter",
        public readonly channelId: string,
        public readonly remaining: Action[],
    ) {}
}
