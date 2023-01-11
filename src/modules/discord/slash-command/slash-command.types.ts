import { Type } from "@nestjs/common";
import { APIApplicationCommand, ChatInputCommandInteraction } from "discord.js";

export interface ISlashCommandDispatcher {
    dispatch(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface SlashCommandHandler {
    methodName: string | symbol;
    methodRef: (...args: any) => any;
    constructor: Type<unknown>;
}

export interface ISlashCommandDiscovery {
    /**
     * Returns a handler for a command interaction identifier.
     */
    getHandler(identifier: string): SlashCommandHandler;
    /**
     * Returns compiled slash command API data for every command registered.
     */
    getApiData(): APIApplicationCommand[];
}
