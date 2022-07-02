import { Inject, Injectable } from "@nestjs/common";
import {
    Client,
    GuildTextBasedChannel,
    NonThreadGuildBasedChannel,
    ThreadChannel,
    VoiceChannel,
} from "discord.js";
import { TriggerActionsCommand } from "../commands/trigger-actions.command";
import { Action } from "../models/action.entity";

export interface ActionPayload {
    data: any;
    channel: ThreadChannel | NonThreadGuildBasedChannel;
    command: TriggerActionsCommand;
}

export interface IActionType {
    execute(payload: ActionPayload): any;
}

interface ActionType extends IActionType {
    type: string;
}

const actions: ActionClass[] = [];
export const getActions = () => [...actions];

interface ActionClass extends Function {
    new (...args: any[]): IActionType;
}

export const ActionType = (type: string) => {
    return (target: ActionClass) => {
        Object.defineProperty(target.prototype, "type", {
            enumerable: true,
            configurable: false,
            get: () => type,
        });
        Injectable()(target); // is there maybe a better way to do this?

        actions.push(target);
    };
};

export async function handleAction<T extends Client>(
    client: T,
    actionTypes: Map<string, ActionType>,
    command: TriggerActionsCommand,
    action: Action,
) {
    const { discordChannelId, discordThreadId, data } = action;

    const channel = await (client.channels.fetch(
        discordChannelId,
    ) as Promise<NonThreadGuildBasedChannel>);

    let thread: ThreadChannel;
    if (channel.isText() && discordThreadId)
        thread = await (channel as any).threads?.fetch(discordThreadId);

    const actionType = actionTypes.get(action.type);
    if (!actionType) {
        throw new Error(`Could not find actionType ${action.type}.`);
    }

    await actionType.execute({
        data,
        channel: thread ?? channel,
        command,
    });
}
