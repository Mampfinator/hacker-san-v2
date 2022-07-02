import { IQuery } from "@nestjs/cqrs";
import { Platform } from "src/constants";
import { FindManyOptions, FindOneOptions } from "typeorm";
import { ChannelEntity } from "../models/channel.entity";

export interface ChannelQueryOptions<T extends boolean> {
    platform?: Platform;
    platformId?: string;

    /**
     * Defaults to true.
     */
    one?: T;
    query?: T extends true
        ? FindOneOptions<ChannelEntity>
        : FindManyOptions<ChannelEntity>;
}

export class ChannelQuery implements IQuery {
    constructor(public readonly options: ChannelQueryOptions<boolean>) {
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
}
