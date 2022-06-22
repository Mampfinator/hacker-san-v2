import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { ListenEvent } from "src/events/listen.event";
import { YouTubeService } from "../youtube.service";

@EventsHandler(ListenEvent)
export class YouTubeListenHandler implements IEventHandler<ListenEvent> {
    constructor(private readonly service: YouTubeService) {}

    async handle() {
        await this.service.init();
    }
}
