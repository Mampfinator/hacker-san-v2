import { FactoryProvider, Inject } from "@nestjs/common";
import { getCommands } from "../slash-command";

export const InjectCommands = () => Inject("SLASH_COMMANDS");

export const slashcommandFactory: FactoryProvider = {
    provide: "SLASH_COMMANDS",
    useFactory: (...args) => {
        return args;
    },
    inject: getCommands()
}