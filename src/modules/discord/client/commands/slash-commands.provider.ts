import { FactoryProvider, Inject } from "@nestjs/common";
import { getCommands } from "./slash-command";

const SLASH_COMMANDS = Symbol("SLASH_COMMANDS");
export const InjectCommands = () => Inject(SLASH_COMMANDS);

export const slashcommandFactory: FactoryProvider = {
    provide: SLASH_COMMANDS,
    useFactory: (...args) => args,
    inject: getCommands(),
};
