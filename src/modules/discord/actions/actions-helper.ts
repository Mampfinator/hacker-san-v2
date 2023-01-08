import { FactoryProvider, Inject } from "@nestjs/common";
import { getActions, getActionType, IActionType } from "./decorators/action";
import { ACTION_TYPE_KEY } from "./action.constants";

const ACTION_TYPES = Symbol("ACTION_TYPES");
export const InjectActions = () => Inject(ACTION_TYPES);
export const actionTypeFactory: FactoryProvider = {
    provide: ACTION_TYPES,
    useFactory: (...args: (IActionType & { prototype: any })[]) => {
        const map = new Map();
        for (const type of args) {
            const key = getActionType(type);

            map.set(key, type);
        }

        return map;
    },
    inject: getActions(),
};
