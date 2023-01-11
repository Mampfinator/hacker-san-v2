import { APIApplicationCommand } from "discord.js";
import { Options } from "./decorators/option.decorator.types";
import { OrchestratorItem } from "./handler-orchestrator";

interface SlashCommandParameter<T extends "options" | "interaction" = "options" | "interaction"> {
    type: T;
    value: T extends "options" ? Options : null;
}

export const METHOD_PARAMETER_MAP = Symbol("Method Parameter Map");
export const addParameter = (target: object, key: string | symbol, index: number, parameter: SlashCommandParameter) => {
    if (!Reflect.hasMetadata(METHOD_PARAMETER_MAP, target))
        Reflect.defineMetadata(METHOD_PARAMETER_MAP, new Map(), target);
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

export const IDENTIFIER_METHOD_MAP = Symbol("Identifier Method Map");
export const DEFAULT_HANDLER = Symbol("Default Handler");

type HandlerMap =Map<any, any>;
type Identifier = (string | symbol)[];

export const getHandlers = (target: object): OrchestratorItem<string | symbol, string | symbol> => {
    return Reflect.getMetadata(IDENTIFIER_METHOD_MAP, target);
};
export const addHandler = (target: object, key: string | symbol, identifier?: Identifier) => {
    if (!Reflect.hasMetadata(IDENTIFIER_METHOD_MAP, target))
        Reflect.defineMetadata(IDENTIFIER_METHOD_MAP, new Map(), target);
    const item = getHandlers(target);
    

};

// TODO: adjust to HandlerOrchestrator
export const findHandler = (target: object, identifier: Identifier): string | symbol => {
    let current: HandlerMap | (string | symbol) = getHandlers(target);
    for (const step of identifier) {
        if (typeof current === "symbol" || typeof current === "string") continue;
        current = current.get(step);
    }
    if (typeof current === "object") throw new Error(`Failed resolving handler for ${identifier.map(String).join(".")}`); 
    return current;
}


export function *interateHandlers(target: object): Iterator<[Identifier, string | symbol]> {
    const handlers = getHandlers(target);
    const mapper = <K, V>(v: Map<K, V> | (string | symbol)) => typeof v === "object" ? (Array.isArray(v) ? v : [...v.values()]) : v;
}