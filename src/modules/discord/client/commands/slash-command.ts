import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { Class } from "src/constants";

const commands: Class<ISlashCommand>[] = [];
export const getCommands = () => [...commands];

export interface SlashCommandOptions {
    commandData: Record<string, any> | SlashCommandBuilder;
    /**
     * Whether this command is restricted to the management guild only.
     */
    restricted?: boolean;
}

// interface classes can implement.
export interface ISlashCommand {
    execute(interaction: CommandInteraction): any;
}

const COMMAND_DATA_KEY = Symbol("COMMAND_DATA");
const IS_RESTRICTED_KEY = Symbol("IS_RESTRICTED");

// interface that represents commands where the prototype has been modified by @SlashCommand.
export interface SlashCommand extends ISlashCommand {
    /**
     * Command data to be sent to the Discord API for registering this command.
     */
    [COMMAND_DATA_KEY]: any;
    /**
     * Returns the guild ID of the owner guild, or undefined if the command is unrestricted.
     */
    [IS_RESTRICTED_KEY]: (guildId: string) => string | undefined;
}

/**
 * Mark this class as a Slash Command. Needs to be imported somewhere to be accessible by `getCommands()` and consequently `@InjectCommands()`.
 */
export const SlashCommand = (options: SlashCommandOptions) => {
    return (target: Class<ISlashCommand>) => {
        if (!options.commandData)
            throw new TypeError("Command data needs to be supplied.");
        if (!(typeof target.prototype.execute === "function"))
            throw new TypeError(
                "SlashCommand decorated class needs an execute function!",
            );

        const commandData =
            options.commandData.toJSON?.() ?? options.commandData;
        // very, very, *very* crude validation, but it's gotta do for now.
        if (!commandData.name || !commandData.description)
            throw new Error(`Invalid commandData passed for ${target.name}`);

        Object.defineProperties(target.prototype, {
            [COMMAND_DATA_KEY]: {
                get: () => commandData,
                enumerable: true,
                configurable: false,
            },
            [IS_RESTRICTED_KEY]: {
                value: (guildId: string) =>
                    options.restricted ? guildId : undefined,
                enumerable: true,
                configurable: false,
            },
        });

        commands.push(target);
    };
};

export const getCommandMetadata = (
    command: SlashCommand,
): { commandData: any; forGuild: (guildId: string) => string | undefined } => {
    const commandData = command[COMMAND_DATA_KEY];
    const forGuild = command[IS_RESTRICTED_KEY];
    return { commandData, forGuild };
};
