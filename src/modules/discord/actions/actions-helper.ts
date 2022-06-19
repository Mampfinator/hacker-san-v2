import { FactoryProvider, Inject } from "@nestjs/common";
import { getActions, IActionType } from "./action";

interface ActionType extends IActionType {
    type: string;
}

const ACTION_TYPES = Symbol("ACTION_TYPES");
export const InjectActions = () => Inject(ACTION_TYPES);
export const actionTypeFactory: FactoryProvider = {
    provide: ACTION_TYPES,
    useFactory: (...args: ActionType[]) => {
        const map = new Map();
        for (const type of args) {
            map.set(type.type, type);
        }

        return map;
    },
    inject: getActions(),
};
