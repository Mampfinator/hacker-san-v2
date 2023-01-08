import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DiscordClientService } from "../client/discord-client.service";
import { ActionDescriptor, Event } from "../models/action.entity";
import { getActionGrouper, IActionType } from "./decorators/action";
import { IActionPayload } from "./action.interfaces";
import { InjectActions } from "./actions-helper";
import { from, groupBy, lastValueFrom, mergeMap, of, toArray, zip } from "rxjs";
import { Class } from "../../../constants";

@Injectable()
export class ActionOrchestrator {
    private readonly groupers = new Map<string, (action: ActionDescriptor) => number>();

    constructor(
        @InjectActions() private readonly actions: Map<string, IActionType>,
        @InjectRepository(ActionDescriptor) private readonly actionRepository: Repository<ActionDescriptor>,
        private readonly client: DiscordClientService,
    ) {
        for (const [type, action] of actions) {
            this.groupers.set(
                type,
                getActionGrouper((action as unknown as { prototype: Class<IActionType> }).prototype),
            );
        }
    }

    public async execute(payload: IActionPayload<Event>): Promise<void> {
        const {
            channel: { platform, platformId: channelId },
            event: onEvent,
        } = payload;

        const actions = await this.groupActions(
            await this.actionRepository.find({
                where: {
                    platform,
                    channelId,
                    onEvent,
                },
            }),
        );

        for (const group of actions) {
            await Promise.allSettled(
                group.map(descriptor =>
                    this.actions.get(descriptor.type).execute({
                        descriptor,
                        payload,
                    }),
                ),
            );
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
