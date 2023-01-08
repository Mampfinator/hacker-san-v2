import { applyDecorators, Injectable, SetMetadata } from "@nestjs/common";
import { Channel } from "discord.js";
import { Class, RestrainedClassDecorator } from "../../../../constants";
import { Primitive } from "../../../../util";
import { ActionDescriptor } from "../../models/action.entity";
import { ACTION_GROUP_KEY, ACTION_TYPE_KEY } from "../action.constants";
import { IActionPayload } from "../action.interfaces";

export interface ActionExecuteOptions {
    descriptor: ActionDescriptor;
    payload: IActionPayload<any>;
}

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

function SimpleSetMetadata(key: string | symbol | number, value: any): ClassDecorator {
    return target => {
        Reflect.metadata(key, value)(target);
    }
}

export function Action(options: ActionOptions): RestrainedClassDecorator<IActionType> {
    return applyDecorators(
        Injectable(),
        AddAction,
        SimpleSetMetadata(ACTION_TYPE_KEY, options.type),
        SimpleSetMetadata(ACTION_GROUP_KEY, options.getGroup ?? defaultGroup),
    );
}

// Decorators and metadata confuse me.
export function getActionType(action: any): string {
    return Reflect.getMetadata(ACTION_TYPE_KEY, action) ?? Reflect.getMetadata(ACTION_TYPE_KEY, Object.getPrototypeOf(action));
}

export function getActionGrouper(action: any): ActionGrouper {
    return Reflect.getMetadata(ACTION_GROUP_KEY, action) ?? Reflect.getMetadata(ACTION_GROUP_KEY, Object.getPrototypeOf(action));
}
