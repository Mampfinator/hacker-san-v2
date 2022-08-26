import { EmbedBuilder } from "discord.js";
import { ICommand } from "@nestjs/cqrs";

import { Platform } from "src/constants";

export interface TriggerActionsCommandOptions {
    platform: Platform;
    event: string;
    url: string; // A URL to the event. Needs to be present for every event type.
    channelId: string;
    embed?: EmbedBuilder;
}

export class TriggerActionsCommand implements ICommand {
    constructor(public readonly options: TriggerActionsCommandOptions) {}
}
