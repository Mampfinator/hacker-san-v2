import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { YouTubeEventSubService } from "../youtube-eventsub.service";
import { SubscribeCommand } from "./subscribe.command";

@CommandHandler(SubscribeCommand)
export class SubscribeHandler implements ICommandHandler<SubscribeCommand> {
    private readonly logger = new Logger(SubscribeHandler.name);
    
    constructor(
        private readonly eventSub: YouTubeEventSubService
    ) {}

    async execute({channelId}: SubscribeCommand): Promise<any> {
        const result = await this.eventSub.subscribe(channelId);
    }
}