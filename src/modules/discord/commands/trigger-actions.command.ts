import { MessageEmbed } from "discord.js";
import {ICommand} from "@nestjs/cqrs";

import { Platform } from "../models/action.entity";

// TODO: actually implement, properly, universally.

export interface TriggerActionsCommandOptions {
    platform: Platform,
    event: string,
    url: string, // A URL to the event. Needs to be present for every event type.
    channelId: string,
    embed?: MessageEmbed
}


export class TriggerActionsCommand implements ICommand {
    constructor(
        public readonly options: TriggerActionsCommandOptions
    ) {}
}