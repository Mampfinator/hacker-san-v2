import { applyDecorators, Injectable, SetMetadata } from "@nestjs/common";
import { Class, RestrainedClassDecorator } from "../../../../constants";
import { ActionDescriptor } from "../../models/action.entity";
import { ACTION_GROUP_KEY, ACTION_TYPE_KEY } from "../action.constants";
import { ActionExecuteOptions } from "../action.interfaces";

export interface IActionType {
    execute(payload: ActionExecuteOptions): any;
}

type ActionGrouper = (descriptor: ActionDescriptor) => number;

export interface ActionOptions {
    type: string;
    /**
     * Used for sorting & batching actions. If no group is specified, the group is considered to be 0. Groups can also be negative.
     */
    getGroup?: ActionGrouper;
}

const actions: Class<IActionType>[] = [];
export const getActions = () => [...actions];

function AddAction(constructor: Class<IActionType>) {
    actions.push(constructor);
}

function defaultGroup() {
    return 0;
}

export function Action(options: ActionOptions): RestrainedClassDecorator<IActionType> {
    return applyDecorators(
        Injectable(),
        AddAction,
        SetMetadata(ACTION_TYPE_KEY, options.type),
        SetMetadata(ACTION_GROUP_KEY, options.getGroup ?? defaultGroup),
    );
}

// Decorators and metadata confuse me.
export function getActionType(action: any): string {
    return (
        Reflect.getMetadata(ACTION_TYPE_KEY, action) ??
        Reflect.getMetadata(ACTION_TYPE_KEY, Object.getPrototypeOf(action)) ??
        Reflect.getMetadata(ACTION_TYPE_KEY, Object.getPrototypeOf(action).constructor)
    );
}

export function getActionGrouper(action: any): ActionGrouper {
    return (
        Reflect.getMetadata(ACTION_GROUP_KEY, action) ??
        Reflect.getMetadata(ACTION_GROUP_KEY, Object.getPrototypeOf(action)) ??
        Reflect.getMetadata(ACTION_GROUP_KEY, Object.getPrototypeOf(action).constructor)
    );
}
