import { ensureData } from "../slash-command.constants";

// TODO: add subcommandGroups option for descriptions and stuff.
export interface SlashCommandOptions {
    name: string;
    description: string;
}

/**
 * Marks this class as a SlashCommand.
 */
export const SlashCommand = (options: SlashCommandOptions): ClassDecorator => {
    return target => {
        const data = ensureData(target);
        data.name = options.name;
        data.description = options.description;
    };
};
