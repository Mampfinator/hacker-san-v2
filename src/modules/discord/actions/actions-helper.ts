import { FactoryProvider, Inject } from "@nestjs/common";
import { getActions, IActionType } from "./action";
import { ACTION_TYPE_KEY } from "./action.constants";

const ACTION_TYPES = Symbol("ACTION_TYPES");
export const InjectActions = () => Inject(ACTION_TYPES);
export const actionTypeFactory: FactoryProvider = {
    provide: ACTION_TYPES,
    useFactory: (...args: (IActionType & { prototype: any })[]) => {
        const map = new Map();
        for (const type of args) {
            map.set(Reflect.getMetadata(ACTION_TYPE_KEY, type.prototype ?? type), type);
        }

        return map;
    },
    inject: getActions(),
};
