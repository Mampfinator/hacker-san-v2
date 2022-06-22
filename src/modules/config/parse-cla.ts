import * as commandLineArgs from "command-line-args";

export const COMMANDLINE_OPTION_DEFINITIONS: commandLineArgs.OptionDefinition[] =
    [
        { name: "no-youtube", type: Boolean, defaultValue: false },
        { name: "no-twitter", type: Boolean, defaultValue: false },
        { name: "no-login", type: Boolean, defaultValue: false },
        { name: "port", type: Number },
        { name: "always-dm", type: Boolean}
    ];

export interface CommandLineOptions {
    noYoutube?: boolean;
    noTwitter?: boolean;
    noLogin?: boolean;
    port?: number;
    dmOwnerOnError?: boolean;
}

export function parseCommandLineArgs(): CommandLineOptions {
    const {
        "no-youtube": noYoutube,
        "no-twitter": noTwitter,
        "no-login": noLogin,
        "always-dm": dmOwnerOnError,
        port,
    } = commandLineArgs(COMMANDLINE_OPTION_DEFINITIONS);

    return {
        noYoutube,
        noTwitter,
        noLogin,
        port,
        dmOwnerOnError
    };
}
