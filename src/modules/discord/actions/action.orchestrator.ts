import { IActionType } from "./action";
import { InjectActions } from "./actions-helper";

/**
 * 
 */
export class ActionOrchestrator {
    constructor(
        @InjectActions() private readonly actions: Map<string, IActionType>
    ) {}
}