import { Injectable, Logger } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ListenEvent } from "./events/listen.event";

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(private readonly eventBus: EventBus, private readonly eventEmitter: EventEmitter2) {}

    public async triggerListen() {
        this.eventBus.publish(new ListenEvent());
        this.eventEmitter.emit("listeners.ready");
    }
}
