import { addParameter } from "../slash-command.constants";
import { Options } from "./option.decorator.types";

/**
 * SlashCommand handler parameter decorator. Defines an option for this slash command (**NOT** valid in `group.*` handlers!) and tells the dispatcher to populate the decorated argument with that option.
 */
export const Option = (options: Options): ParameterDecorator => {
    return (target, key, index) => {
        addParameter(target.constructor, key, index, { type: "options", value: options });
    };
};
