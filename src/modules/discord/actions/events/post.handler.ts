import { CommandBus, EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { PostEvent } from "../../../platforms/events/platform-event";
import { ActionOrchestrator } from "../action.orchestrator";

@EventsHandler(PostEvent)
export class ExecuteActionsPostHandler implements IEventHandler<PostEvent> {
    constructor(
        private readonly orchestrator: ActionOrchestrator
    ) {}

    async handle(event: PostEvent) {
        this.orchestrator.execute(event);
    }
}
