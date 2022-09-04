import { ICommand } from "@nestjs/cqrs";

export class FullChannelCrawlCommand implements ICommand {
    constructor(public readonly channelId: string) {}
}
