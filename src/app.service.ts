import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";
import { ListenEvent } from "./events/listen.event";

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);
    
    constructor(
        private readonly eventBus: EventBus,
    ) {}

    public async triggerListen() {
        this.eventBus.publish(new ListenEvent());
    }
}
