import { EmbedBuilder } from "discord.js";
import { ICommand } from "@nestjs/cqrs";
import { Platform } from "../../../constants";

export interface TriggerActionsCommandOptions {
    platform: Platform;
    event: string;
    /**
     * A URL to the event. So youtube.com/watch?v=..., twitch.tv/..., etc.
     */
    url: string; 
    channelId: string;
    embed?: EmbedBuilder;
}

export class TriggerActionsCommand implements ICommand {
    constructor(public readonly options: TriggerActionsCommandOptions) {}
}
