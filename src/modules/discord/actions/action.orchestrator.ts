import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DiscordClientService } from "../discord-client.service";
import { ActionDescriptor } from "../models/action.entity";
import { Event } from "../../../constants";
import { getActionGrouper, IActionType } from "./decorators/action";
import { IActionPayload } from "./action.interfaces";
import { InjectActions } from "./actions-helper";
import { from, groupBy, lastValueFrom, mergeMap, of, toArray, zip } from "rxjs";

@Injectable()
export class ActionOrchestrator implements OnModuleInit {
    private readonly groupers = new Map<string, (action: ActionDescriptor) => number>();
    private readonly logger = new Logger(ActionOrchestrator.name);

    constructor(
        @InjectActions() private readonly actions: Map<string, IActionType>,
        @InjectRepository(ActionDescriptor) private readonly actionRepository: Repository<ActionDescriptor>,
        private readonly client: DiscordClientService,
    ) {}

    onModuleInit() {
        for (const [type, action] of this.actions) {
            this.groupers.set(type, getActionGrouper(action));
        }
    }

    public async execute<TEvent extends Event = Event>(payload: IActionPayload<TEvent>): Promise<void> {
        const {
            channel: { platform, platformId: channelId },
            event: onEvent,
        } = payload;

        const actions = await this.actionRepository.find({
            where: {
                platform,
                channelId,
                onEvent,
            },
        });

        const actionGroups = await this.groupActions(actions);

        for (const group of actionGroups) {
            const results = await Promise.allSettled(
                group.map(descriptor =>
                    this.actions.get(descriptor.type).execute({
                        descriptor,
                        payload,
                    }),
                ),
            );

            for (const result of results) {
                if (result.status === "fulfilled") return;

                this.logger.warn(`Action failed to execute: ${result.reason}`);                
            }
        }
    }

    /**
     * @returns actions grouped and ordered by their execution priority.
     */
    private async groupActions(actions: ActionDescriptor[]): Promise<ActionDescriptor[][]> {
        return lastValueFrom(
            from(actions).pipe(
                groupBy(descriptor => this.groupers.get(descriptor.type)(descriptor)),
                mergeMap(group => zip(of(group.key), group.pipe(toArray()))),
                toArray(),
            ),
        ).then(groups => groups.sort(([priorityA], [priorityB]) => priorityA - priorityB).map(([_, group]) => group));
    }
}
