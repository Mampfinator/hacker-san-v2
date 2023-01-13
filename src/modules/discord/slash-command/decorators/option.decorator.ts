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


export const String = (options: Omit<StringOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.String});
}

export const Integer = (options: Omit<IntegerOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.Integer});
}

export const Boolean = (options: Omit<BooleanOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.Boolean});
}

export const Member = (options: Omit<UserOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.User })
}

export const Channel = (options: Omit<UserOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.Channel});
}

export const Role = (options: Omit<RoleOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.Role});
}

export const Mentionable = (options: Omit<MentionableOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.Mentionable});
}

export const Number = (options: Omit<NumberOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.Number});
}

export const Attachment = (options: Omit<AttachmentOption, "type">): ParameterDecorator => {
    return Option({...options, type: OptionType.Attachment});
}