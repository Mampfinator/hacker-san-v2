import { Type } from "@nestjs/common";
import { ApplicationCommandData, ChatInputCommandInteraction } from "discord.js";
import { CommandIdentifier } from "./slash-command.constants";

export interface ISlashCommandDispatcher {
    dispatch(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface SlashCommandHandler {
    methodName: string | symbol;
    instance: unknown;
    constructor: Type<unknown>;
}

export interface ISlashCommandDiscovery {
    /**
     * Returns a handler for a command interaction identifier.
     */
    getHandler(identifier: CommandIdentifier): SlashCommandHandler | undefined;
    /**
     * Returns compiled slash command API data for every command registered.
     */
    getApiData(): ApplicationCommandData[];
}
