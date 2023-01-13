import { RequireAtLeastOne } from "yt-scraping-utilities/dist/util";
import { addHandler, ensureData } from "../slash-command.constants";
import { OptionType } from "./option.decorator.types";

/**
 * Options to identify which subcommand this method handles. If no options are passed, this method will be marked as the base handler.
 */
export interface CommandOptions {
    subcommandName?: string;
    subcommandGroupName?: string;
    description: string;
}

/**
 * SlashCommand handler decorator. Marks this method as a handler for a specific slash command.
 */
export const Command = (
    options?: RequireAtLeastOne<CommandOptions, "subcommandName" | "subcommandGroupName">,
): MethodDecorator => {
    return (target, key, _descriptor) => {
        const data = ensureData(target.constructor);
        if (options) {
            const { subcommandName, subcommandGroupName } = options;

            const subcommand = {
                type: OptionType.Subcommand,
                name: subcommandName,
                description: options.description,
                options: [],
            };

            if (subcommandGroupName) {
                let group = data.options.find(group => group.name === subcommandGroupName);
                if (!group) {
                    group = {
                        type: OptionType.SubcommandGroup,
                        name: subcommandGroupName,
                        description: "",
                        options: [],
                    };

                    data.options.push(group);
                }
                if (group.type !== OptionType.SubcommandGroup)
                    throw new TypeError(
                        `Expected to find group with name ${subcommandGroupName}, found type ${group.type} instead!`,
                    );
                // @ts-ignore
                // this shouldd be fine, but djs typings are complaining.
                group.options.push(subcommand);
            } else {
                // @ts-ignore
                // this should also be fine, but djs typings are still complaining.
                data.options.push(subcommand);
            }
        }

        addHandler(target.constructor, key, options ?? {});
    };
};
