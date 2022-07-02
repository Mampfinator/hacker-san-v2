import { ICommand } from "@nestjs/cqrs";
import { ChannelInfo } from "yt-scraping-utilities";

export class CacheChannelInfoCommand implements ICommand {
    constructor(public readonly channelInfo: ChannelInfo) {}
}
