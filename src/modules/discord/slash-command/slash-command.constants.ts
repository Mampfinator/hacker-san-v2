import { APIApplicationCommand } from "discord.js";
import { PLATFORM_CHOICES } from "../util";
import { Options, StringOption } from "./decorators/option.decorator.types";

export interface SlashCommandParameter<T extends "options" | "interaction" = "options" | "interaction"> {
    type: T;
    value: T extends "options" ? Options : null;
}

export const METHOD_PARAMETER_MAP = Symbol("Method Parameter Map");
export const addParameter = (target: object, key: string | symbol, index: number, parameter: SlashCommandParameter) => {
    if (!Reflect.hasMetadata(METHOD_PARAMETER_MAP, target))
        Reflect.defineMetadata(METHOD_PARAMETER_MAP, new Map(), target); // ensure parameter map is present
    const map = getParameterMap(target);

    if (!map.has(key)) map.set(key, []);
    map.get(key)[index] = parameter;
};
export const getParameterMap = (target: object): Map<string | symbol, SlashCommandParameter[]> | undefined => {
    return Reflect.getMetadata(METHOD_PARAMETER_MAP, target);
};
export const getParameters = (target: object, method: string | symbol): SlashCommandParameter[] => {
    const map = getParameterMap(target);
    if (!map) return;
    return map.get(method);
};

export const SLASHCOMMAND_DATA = Symbol("SlashCommand Data");
export const ensureData = (target: object): Partial<APIApplicationCommand> => {
    if (!Reflect.hasMetadata(SLASHCOMMAND_DATA, target))
        Reflect.defineMetadata(SLASHCOMMAND_DATA, { options: [] }, target);
    return Reflect.getMetadata(SLASHCOMMAND_DATA, target);
};

export const IDENTIFIER_METHODS = Symbol("Identifier Method Map");
/**
 * This handler is a default handler.
 */
export const DEFAULT_HANDLER = Symbol("Default Handler");
/**
 * This subcommand handler does not belong to any subcommand group.
 */
export const NO_GROUP_HANDLER = Symbol("No Group Handler");

interface HandlerItem {
    /**
     * Always present.
     */
    commandName: string;
    /**
     * If missing, handler is default.
     */
    subcommandName?: string | symbol;
    subcommandGroupName?: string | symbol;
    methodKey: string | symbol;
}
interface SubCommandIdentifier {
    subcommandName?: string;
    subcommandGroupName?: string;
}

export const getHandlers = (target: object): HandlerItem[] => {
    return Reflect.getMetadata(IDENTIFIER_METHODS, target);
};
export const addHandler = (
    target: object,
    key: string | symbol,
    { name, group }: { name?: string; group?: string },
) => {
    if (!Reflect.hasMetadata(IDENTIFIER_METHODS, target)) Reflect.defineMetadata(IDENTIFIER_METHODS, [], target);

    const handlers = getHandlers(target);

    const subcommandName = name ?? DEFAULT_HANDLER;
    const subcommandGroupName = group ?? (name ? NO_GROUP_HANDLER : DEFAULT_HANDLER);

    handlers.push({
        commandName: "",
        subcommandName,
        subcommandGroupName,
        methodKey: key,
    });
};

export type CommandIdentifier = SubCommandIdentifier & { commandName: string };
const Predicates: Record<string, (identifier: CommandIdentifier, item: HandlerItem) => boolean> = {
    isGeneralHandler(identifier: CommandIdentifier, item: HandlerItem) {
        return !item.subcommandName;
    },
    isCorrectSubcommandHandler(identifier, item) {
        return (
            item.subcommandGroupName === identifier.subcommandGroupName &&
            item.subcommandName === identifier.subcommandName
        );
    },
};


export const PLATFORM_OPTIONS: Omit<StringOption, "type"> = {
    name: "platform",
    description: "Platform to trigger events for.",
    choices: PLATFORM_CHOICES,
    required: true,
};

export const CHANNELID_OPTIONS: Omit<StringOption, "type"> = {
    name: "channel_id",
    description: "The channel ID to watch. Can be an ID or an @Handle",
    required: true,
};

export const DEFAULT_EVENT_OPTIONS: Omit<StringOption, "type"> = {
    name: "event",
    description: "Which event to listen for.",
    choices: [
        { name: "Upload", value: "upload" },
        { name: "Live", value: "live" },
        { name: "Upcoming", value: "upcoming" },
        { name: "Offline", value: "offline" },
        { name: "Post", value: "post" },
    ],
    required: true,
};