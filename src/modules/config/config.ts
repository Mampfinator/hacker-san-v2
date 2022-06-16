import { parse as parseToml } from "toml";
import { readFileSync } from "fs";
import { join } from "path";
import { parse as parseEnv, DotenvParseOutput } from "dotenv";
import { DEFAULT_PORT, DISCORD_COMMAND_CLEANUP_DEFAULT } from "./defaults";

interface PlatformConfig {
    active: boolean;
}

export interface DiscordConfig {
    token: string;
    cleanUpOnStart: boolean;
    testGuildId?: string;
    ownerGuild?: string;
    ownerId?: string; 
}

export interface YouTubeConfig extends PlatformConfig {
    apiKey?: string;
    secret?: string;
}

export interface TwitterConfig extends PlatformConfig {
    token?: string;
}

interface envConfig extends DotenvParseOutput {
    DATABASE_URL: string;
    DISCORD_TOKEN: string;
    YOUTUBE_API_KEY?: string;
    YOUTUBE_SECRET?: string;
    TWITTER_TOKEN?: string;
}

interface TOMLConfig {
    app: {
        port: number;
        includePortInUrl?: boolean;
        domain: string;
        disableServices?: string[];
        https?: boolean;
    }

    discord: {
        cleanupOldCommands?: boolean;
        testGuildId?: string;
        ownerId?: string;
        ownerGuild?: string;
    }
}

export default () => {
    const tomlConfigFile = readFileSync(join(__dirname, "..", "..", "..", "config.toml"));
    const tomlOptions: TOMLConfig = parseToml(tomlConfigFile.toString());
    const envConfig = {
        ...process.env,
        ...parseEnv<envConfig>(readFileSync(join(__dirname, "..", "..", "..", ".env"))),
    };

    if (!envConfig.DISCORD_TOKEN) throw new Error("DISCORD_TOKEN not found in environment variables");
    if (!envConfig.DATABASE_URL) throw new Error("DATABASE_URL not found in environment variables");

    const YOUTUBE: YouTubeConfig = {
        active: !tomlOptions.app?.disableServices?.includes("youtube"),
        apiKey: envConfig.YOUTUBE_API_KEY,
        secret: envConfig.YOUTUBE_SECRET
    };
    const TWITTER: TwitterConfig = {
        active: !tomlOptions.app?.disableServices?.includes("twitter"),
        token: envConfig.TWITTER_TOKEN
    };
    const DISCORD: DiscordConfig = {
        token: envConfig.DISCORD_TOKEN,
        cleanUpOnStart: tomlOptions.discord.cleanupOldCommands ?? DISCORD_COMMAND_CLEANUP_DEFAULT,
        testGuildId: tomlOptions.discord.testGuildId,
        ownerId: tomlOptions.discord.ownerId,
        ownerGuild: tomlOptions.discord.ownerGuild
    }

    const PORT = tomlOptions.app.port ?? DEFAULT_PORT;
    const {DATABASE_URL} = envConfig;


    const URL = `http${
        (tomlOptions.app.https ?? true) ? "s" : ""
    }://${tomlOptions.app.domain}${tomlOptions.app.includePortInUrl ? `:${PORT}` : ""}`;

    return {
        YOUTUBE,
        TWITTER,
        DISCORD,
        PORT,
        DATABASE_URL, 
        URL
    };
}