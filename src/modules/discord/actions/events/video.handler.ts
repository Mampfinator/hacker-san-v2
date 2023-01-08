import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { VideoEvent } from "../../../platforms/events/platform-event";

@EventsHandler(VideoEvent)
export class ExecuteActionsVideoHandler implements IEventHandler<VideoEvent> {
    handle(event: VideoEvent) {}
}
