import { CommandBus, EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { VideoEvent } from "../../../platforms/events/platform-event";
import { ActionOrchestrator } from "../action.orchestrator";
import { CreateMapCommand } from "../types/thread-action/commands/create-map.command";
import { RemoveMapCommand } from "../types/thread-action/commands/remove-map.command";

@EventsHandler(VideoEvent)
export class ExecuteActionsVideoHandler implements IEventHandler<VideoEvent> {
    constructor(
        private readonly orchestrator: ActionOrchestrator,
        private readonly commandBus: CommandBus, 
    ) {}

    async handle(event: VideoEvent) {
        if (event.event === "live") {
            await this.commandBus.execute(new CreateMapCommand(event.video));
        } else if (event.event === "offline") {
            await this.commandBus.execute(new RemoveMapCommand(event.video));
        }
        
        this.orchestrator.execute(event);
    }
}
