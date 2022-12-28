import { applyDecorators, Injectable, SetMetadata } from "@nestjs/common";
import { Channel, GuildChannel } from "discord.js";
import { Class, RestrainedClassDecorator } from "../../../constants";
import { TriggerActionsCommand } from "../commands/trigger-actions.command";
import { ActionDescriptor } from "../models/action.entity";
import { ACTION_GROUP_KEY, ACTION_TYPE_KEY } from "./action.constants";

export interface ActionPayload {
    action: ActionDescriptor;
    channel: Channel;
    command: TriggerActionsCommand;
}

export interface IActionType {
    execute(payload: ActionPayload): any; 
}

export interface ActionOptions {
    type: string;
    /**
     * Used for sorting & batching actions. If no group is specified, the group is considered to be 0.
     */
    getGroup?: (action: ActionDescriptor) => number;
}

const actions: Class<IActionType>[] = [];
export const getActions = () => [...actions];


function AddAction(constructor: Class<IActionType>) {
    actions.push(constructor);
}

function defaultGroup() { return 0 };

export function Action(options: ActionOptions): RestrainedClassDecorator<IActionType> {
    return applyDecorators(
        Injectable(),
        AddAction,
        SetMetadata(ACTION_TYPE_KEY, options.type),
        SetMetadata(ACTION_GROUP_KEY, options.getGroup ?? defaultGroup),
    )
}

export function getActionType(action: Class<IActionType>) {
    return Reflect.getMetadata(ACTION_TYPE_KEY, action);
}

export function getActionGrouper(action: Class<IActionType>) {
    return Reflect.getMetadata(ACTION_GROUP_KEY, action);
}