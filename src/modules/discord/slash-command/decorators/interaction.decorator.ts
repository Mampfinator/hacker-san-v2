import { addParameter } from "../slash-command.constants";

/**
 * SlashCommand handler parameter decorator. Tells the dispatcher to populate this argument with the interaction as dispatched by discord.js.
 */
export const Interaction = (): ParameterDecorator => {
    return (target, key, index) => {
        addParameter(target.constructor, key, index, { type: "interaction", value: null });
    };
};
