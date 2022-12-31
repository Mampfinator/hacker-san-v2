import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "toml";

export interface TOMLOptions {
    app: {
        port: number;
        includePortInUrl?: boolean;
        domain: string;
        disableServices?: string[];
        https?: boolean;
    };

    discord: {
        cleanupOldCommands?: boolean;
        testGuildId?: string;
        ownerId?: string;
        ownerGuild?: string;
    };

    youtube: {
        channelScanInterval?: number;
    };
}

export function parseTOML(): TOMLOptions {
    try {
        const tomlOptions: TOMLOptions = parse(readFileSync(join(process.cwd(), "config.toml")).toString());

        return tomlOptions;
    } catch (error) {}
}
