import { ActionDescriptor } from "../../models/action.entity";
import { Action, ActionPayload, IActionType } from "../action";

const ORDER = {
    delete: 1,
    create: -1,
}

@Action({
    type: "thread", 
    getGroup: (descriptor: ActionDescriptor) => {
        return ORDER[(descriptor.data as {mode: "delete" | "create"}).mode];
    }
})
export class ThreadAction implements IActionType {
    constructor(
        
    ) {}
    
    execute(payload: ActionPayload) {

    }
}