import { parse } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

export interface EnvOptions {
    DATABASE_URL: string;
    DISCORD_TOKEN: string;
    YOUTUBE_API_KEY?: string;
    YOUTUBE_SECRET?: string;
    TWITTER_TOKEN?: string;
}

const checkRequired = (
    input: Record<string, any>,
    keys: (keyof EnvOptions)[],
) => {
    for (const key of keys) {
        if (typeof input[key] == undefined) {
            throw new Error(
                `[ParseEnv]: Option ${key} is required but missing.`,
            );
        }
    }
};

export function parseEnv(): EnvOptions {
    const envConfig: EnvOptions = {
        ...process.env,
        ...(parse(
            readFileSync(join(process.cwd(), ".env")),
        ) as unknown as EnvOptions), // we don't care about env.TZ :)
    };

    checkRequired(envConfig, ["DISCORD_TOKEN", "DATABASE_URL"]);

    return envConfig;
}
