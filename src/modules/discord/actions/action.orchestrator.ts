import { Channel } from "discord.js";
import { TriggerActionsCommand } from "../commands/trigger-actions.command";
import { ActionDescriptor } from "../models/action.entity";
import { IActionType } from "./action";
import { InjectActions } from "./actions-helper";

export class ActionOrchestrator {
    constructor(@InjectActions() private readonly actions: Map<string, IActionType>) {}

    public async execute(command: TriggerActionsCommand, actionDescriptor: ActionDescriptor, channel: Channel) {
        const executor = this.actions.get(actionDescriptor.type);

        try {
            await executor.execute({
                action: actionDescriptor,
                channel,
                command,
            });
        } catch (error) {}
    }
}
