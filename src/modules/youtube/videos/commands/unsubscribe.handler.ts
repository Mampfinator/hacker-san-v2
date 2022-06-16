import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { YouTubeEventSubService } from "../youtube-eventsub.service";
import { UnsubscribeCommand } from "./unsubscribe.command";

@CommandHandler(UnsubscribeCommand)
export class UnsubscribeHandler implements ICommandHandler<UnsubscribeCommand> {
    private readonly logger = new Logger(UnsubscribeHandler.name);
    
    constructor(
        private readonly eventSub: YouTubeEventSubService
    ) {}

    async execute({channelId}: UnsubscribeCommand): Promise<any> {
        const result = await this.eventSub.unsubscribe(channelId);
    }
}