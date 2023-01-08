import { CommandBus, EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { PostEvent } from "../../../platforms/events/platform-event";

@EventsHandler(PostEvent)
export class ExecuteActionsPostHandler implements IEventHandler<PostEvent> {
    constructor() {}

    async handle(event: PostEvent) {}
}
