import { IQuery } from "@nestjs/cqrs";
import { Platform } from "src/constants";
import { FindManyOptions, FindOneOptions, In } from "typeorm";
import { StreamEntity, StreamStatus } from "../models/stream.entity";

export interface StreamQueryOptions<T extends boolean> {
    platform?: Platform;
    platformId?: string;

    one?: T;
    query?: T extends true
        ? FindOneOptions<StreamEntity>
        : FindManyOptions<StreamEntity>;
}

export class StreamQuery implements IQuery {
    constructor(public readonly options: StreamQueryOptions<boolean>) {
        if (options.platform && !options.platformId) {
            throw new Error(
                "platformId is required when platform is specified",
            );
        }

        if (options.platformId && !options.platform) {
            throw new Error(
                "platform is required when platformId is specified",
            );
        }

        if (options.query && (options.platform || options.platformId)) {
            throw new Error(
                "query cannot be specified when platform or platformId is specified",
            );
        }
    }

    // used for YouTube, specifically.
    public static allNonOfflineQuery(platform: Platform, platformId?: string) {
        return new StreamQuery({
            query: {
                where: {
                    platform,
                    platformId,
                    status: In([StreamStatus.Live, StreamStatus.Upcoming]),
                },
            },
        });
    }
}
