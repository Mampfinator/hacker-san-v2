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
    const {
        "no-youtube": noYoutube,
        "no-twitter": noTwitter,
        "no-login": noLogin,
        "always-dm": dmOwnerOnError,
        "skip-sync": skipSync,
        port,
        "deploy-global-commands": deployGlobalCommands,
    } = commandLineArgs(COMMANDLINE_OPTION_DEFINITIONS);

    return {
        noYoutube,
        noTwitter,
        noLogin,
        port,
        dmOwnerOnError,
        skipSync,
        deployGlobalCommands,
    };
}
