import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { VideoEvent } from "../../../platforms/events/platform-event";
import { ActionOrchestrator } from "../action.orchestrator";

@EventsHandler(VideoEvent)
export class ExecuteActionsVideoHandler implements IEventHandler<VideoEvent> {
    constructor(
        private readonly orchestrator: ActionOrchestrator
    ) {}
    
    handle(event: VideoEvent) {
        this.orchestrator.execute(event);
    }
}
