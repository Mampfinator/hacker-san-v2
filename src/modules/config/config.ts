import { DISCORD_COMMAND_CLEANUP_DEFAULT, PORT_DEFAULT, YOUTUBE_CHANNEL_SCAN_INTERVAL_DEFAULT } from "./defaults";
import { parseCommandLineArgs } from "./parse-cla";
import { parseEnv } from "./parse-env";
import { parseTOML, TOMLOptions } from "./parse-toml";

interface PlatformConfig {
    active: boolean;
}

export interface DiscordConfig {
    token: string;
    cleanUpOnStart: boolean;
    testGuildId?: string;
    ownerGuild?: string;
    ownerId?: string;
    doLogin?: boolean;
    dmOwnerOnError: boolean;
    deployGlobalCommands: boolean;
}

export interface YouTubeConfig extends PlatformConfig {
    apiKey?: string;
    secret?: string;
    channelScanInterval: number;
}

export interface TwitterConfig extends PlatformConfig {
    token?: string;
}

export default () => {
    const tomlOptions = parseTOML() ?? ({} as TOMLOptions);
    const envConfig = parseEnv();
    const claConfig = parseCommandLineArgs();

    // TODO: actually implement disabling services.
    // maybe look into a dynamic module and make the platform module responsible for conditionally importing the YouTube-/Twitter-/etc modules.

    const YOUTUBE: YouTubeConfig = {
        active: claConfig.noYoutube ?? !tomlOptions.app?.disableServices?.includes("youtube"),
        apiKey: envConfig.YOUTUBE_API_KEY,
        secret: envConfig.YOUTUBE_SECRET,
        channelScanInterval: tomlOptions.youtube?.channelScanInterval ?? YOUTUBE_CHANNEL_SCAN_INTERVAL_DEFAULT,
    };

    const TWITTER: TwitterConfig = {
        active: claConfig.noTwitter ?? !tomlOptions.app?.disableServices?.includes("twitter"),
        token: envConfig.TWITTER_TOKEN,
    };

    const DISCORD: DiscordConfig = {
        token: envConfig.DISCORD_TOKEN,
        cleanUpOnStart: tomlOptions.discord?.cleanupOldCommands ?? DISCORD_COMMAND_CLEANUP_DEFAULT,
        testGuildId: tomlOptions.discord?.testGuildId,
        ownerId: tomlOptions.discord?.ownerId,
        ownerGuild: tomlOptions.discord?.ownerGuild,
        doLogin: !claConfig.noLogin,
        dmOwnerOnError: claConfig.dmOwnerOnError ?? process.env.NODE_ENV === "production",
        deployGlobalCommands: claConfig.deployGlobalCommands ?? process.env.NODE_ENV === "production",
    };

    const PORT = claConfig.port ?? tomlOptions.app?.port ?? PORT_DEFAULT;
    const { DATABASE_URL } = envConfig;

    let URL: string;
    if (tomlOptions.app?.domain) {
        URL = `http${tomlOptions.app?.https ?? true ? "s" : ""}://${tomlOptions.app.domain}${
            tomlOptions.app.includePortInUrl ? `:${PORT}` : ""
        }`;
    }

    const finalConfig = {
        YOUTUBE,
        TWITTER,
        DISCORD,
        PORT,
        DATABASE_URL,
        URL,
        SKIP_SYNC: claConfig.skipSync ?? false,
    };

    if (claConfig.printConfig) console.log(finalConfig);

    return finalConfig;
};
