import { APIApplicationCommandSubcommandGroupOption } from "discord.js";
import { ElementType, Util } from "../../../../shared/util/util";
import { ensureData } from "../slash-command.constants";
import { descriptionSchema, nameSchema } from "../slash-command.schemas";
import { OptionType } from "./option.decorator.types";

// TODO: add subcommandGroups option for descriptions and stuff.
export interface SlashCommandOptions {
    name: string;
    description: string;
    subcommandGroups?: Omit<APIApplicationCommandSubcommandGroupOption, "type" | "required" | "options">[];
}

/**
 * Marks this class as a SlashCommand.
 */
export const SlashCommand = (options: SlashCommandOptions): ClassDecorator => {
    return target => {
        const data = ensureData(target);
        data.name = nameSchema.parse(options.name);
        data.description = descriptionSchema.parse(options.description);

        if (!options.subcommandGroups || options.subcommandGroups.length === 0) return;
        const toFullOption = (option: ElementType<SlashCommandOptions["subcommandGroups"]>) =>
            ({
                ...option,
                type: OptionType.SubcommandGroup,
                required: false,
            } as APIApplicationCommandSubcommandGroupOption);

        if (data.options) {
            for (const group of options.subcommandGroups.map(toFullOption)) {
                nameSchema.parse(group.name);
                descriptionSchema.parse(group.description);

                const existingOption = data.options.find(
                    ({ type, name }) => type === OptionType.SubcommandGroup && name === group.name,
                );
                if (!existingOption) {
                    data.options.push(group);
                } else {
                    const index = data.options.indexOf(existingOption);
                    data.options[index] = Util.merge(group, existingOption);
                }
            }
        } else data.options = options.subcommandGroups?.map(toFullOption);
    };
};
