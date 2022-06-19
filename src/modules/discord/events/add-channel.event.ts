import { IEvent } from "@nestjs/cqrs";

export class AddChannelEvent implements IEvent {
    constructor(
        public readonly platform: "YouTube" | "Twitter",
        public readonly channelId: string,
    ) {}
}
