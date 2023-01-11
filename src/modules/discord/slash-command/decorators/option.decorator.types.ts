import { ChannelType } from "discord.js";
import { ApplicationCommandOptionType as OptionType } from "discord.js";
export { OptionType };

interface BaseOption<T extends OptionType> {
    type: OptionType;
    name: string;
    description: string;
    required?: boolean;
}

interface Choice<T extends OptionType.String | OptionType.Integer | OptionType.Number> {
    name: string;
    value: T extends OptionType.String ? string : number;
}

interface HasChoices<T extends OptionType.String | OptionType.Integer | OptionType.Number> {
    choices?: Choice<T>[];
}

interface IsAutocompletable {
    autocomplete?: boolean;
}

interface HasLength {
    min_length?: string;
    max_length?: string;
}

interface HasMinMax {
    min_value?: number;
    max_value?: number;
}

interface HasChannelTypes {
    channel_types?: Exclude<ChannelType, ChannelType.DM | ChannelType.GroupDM>[];
}

export type StringOption = BaseOption<OptionType.String> &
    HasChoices<OptionType.String> &
    HasLength &
    IsAutocompletable;
export type IntegerOption = BaseOption<OptionType.Integer> &
    HasChoices<OptionType.Integer> &
    HasMinMax &
    IsAutocompletable;
export type BooleanOption = BaseOption<OptionType.Boolean>;
export type UserOption = BaseOption<OptionType.User>;
export type ChannelOption = BaseOption<OptionType.Channel> & HasChannelTypes;
export type RoleOption = BaseOption<OptionType.Role>;
export type MentionableOption = BaseOption<OptionType.User | OptionType.Role>;
export type NumberOption = BaseOption<OptionType.Number> &
    HasChoices<OptionType.Number> &
    HasMinMax &
    IsAutocompletable;
export type AttachmentOption = BaseOption<OptionType.Attachment>;
export type SubcommandOption<Group extends boolean> = BaseOption<
    Group extends true ? OptionType.SubcommandGroup : OptionType.Subcommand
>;

export type Options =
    | StringOption
    | IntegerOption
    | BooleanOption
    | UserOption
    | ChannelOption
    | RoleOption
    | MentionableOption
    | NumberOption
    | AttachmentOption;
