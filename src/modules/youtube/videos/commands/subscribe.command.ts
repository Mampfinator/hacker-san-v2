import { ICommand } from "@nestjs/cqrs";

export class SubscribeCommand implements ICommand {
    constructor(
        public readonly channelId: string
    ) {}
}