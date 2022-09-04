import { Logger } from "@nestjs/common";
import * as commandLineArgs from "command-line-args";

export const COMMANDLINE_OPTION_DEFINITIONS: commandLineArgs.OptionDefinition[] =
    [
        { name: "no-youtube", type: Boolean, defaultValue: false },
        { name: "no-twitter", type: Boolean, defaultValue: false },
        { name: "no-login", type: Boolean, defaultValue: false },
        { name: "port", alias: "p", type: Number },
        { name: "always-dm", type: Boolean },
        { name: "print-config", type: Boolean },
        { name: "skip-sync", type: Boolean },
        { name: "deploy-global-commands", type: Boolean },
    ];

export interface CommandLineOptions {
    noYoutube?: boolean;
    noTwitter?: boolean;
    noLogin?: boolean;
    port?: number;
    dmOwnerOnError?: boolean;
    skipSync?: boolean;
    printConfig?: boolean;
    deployGlobalCommands?: boolean;
}

export function parseCommandLineArgs(): CommandLineOptions {
    const logger = new Logger(`ParseCommandLineArgs`);

    try {
        const {
            "no-youtube": noYoutube,
            "no-twitter": noTwitter,
            "no-login": noLogin,
            "always-dm": dmOwnerOnError,
            "skip-sync": skipSync,
            port,
            "deploy-global-commands": deployGlobalCommands,
        } = commandLineArgs(COMMANDLINE_OPTION_DEFINITIONS, { partial: true });

        return {
            noYoutube,
            noTwitter,
            noLogin,
            port,
            dmOwnerOnError,
            skipSync,
            deployGlobalCommands,
        };
    } catch (error) {
        logger.error(`Failed loading command line args: ${error.message}.`);
    }
}
