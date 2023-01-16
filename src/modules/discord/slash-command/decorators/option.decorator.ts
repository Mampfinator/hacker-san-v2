import { addParameter } from "../slash-command.constants";
import {
    Options,
    OptionType,
    StringOption,
    IntegerOption,
    BooleanOption,
    UserOption,
    ChannelOption,
    RoleOption,
    MentionableOption,
    NumberOption,
    AttachmentOption,
} from "./option.decorator.types";

/**
 * SlashCommand handler parameter decorator. Defines an option for this slash command (**NOT** valid in `group.*` handlers!) and tells the dispatcher to populate the decorated argument with that option.
 */
export const Option = (options: Options): ParameterDecorator => {
    return (target, key, index) => {
        addParameter(target.constructor, key, index, { type: "options", value: options });
    };
};
/**
 * Defines a string option and makes it available for automatic population.
 */
export const String = (options: Omit<StringOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.String });
};

/**
 * Defines an integer option and makes it available for automatic population.
 */
export const Integer = (options: Omit<IntegerOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.Integer });
};

/**
 * Defines a boolean option and makes it available for automatic population.
 */
export const Boolean = (options: Omit<BooleanOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.Boolean });
};

/**
 * Defines a user option and makes it available for automatic population. The option is populated with a `GuildMember`, **NOT** a `User`.
 */
export const Member = (options: Omit<UserOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.User });
};

/**
 * Defines a channel option and makes it available for automatic population.
 */
export const Channel = (options: Omit<ChannelOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.Channel });
};

/**
 * Defines a role option and makes it available for automatic population.
 */
export const Role = (options: Omit<RoleOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.Role });
};

/**
 * Defines a mentionable option and makes it available for automatic population.
 */
export const Mentionable = (options: Omit<MentionableOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.Mentionable });
};

/**
 * Defines a number option and makes it available for automatic population.
 */
export const Number = (options: Omit<NumberOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.Number });
};

/**
 * Defines an attachment option and makes it available for automatic population.
 */
export const Attachment = (options: Omit<AttachmentOption, "type">): ParameterDecorator => {
    return Option({ ...options, type: OptionType.Attachment });
};
