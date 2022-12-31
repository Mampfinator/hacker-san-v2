import { Platform } from "../../../constants";
import { FindManyOptions, FindOneOptions, FindOptionsWhere } from "typeorm";
import { ChannelEntity } from "../models/channel.entity";
import { Query } from "@nestjs-architects/typed-cqrs";

export interface ChannelQueryOptions<T extends boolean> {
    one?: T;
    query: T extends true ? FindOneOptions<ChannelEntity> : FindManyOptions<ChannelEntity>;
}

export class ChannelQuery<T extends boolean = false>
    extends Query<T extends true ? ChannelEntity : ChannelEntity[]>
    implements ChannelQueryOptions<T>
{
    public readonly one: T;
    public readonly query: T extends true ? FindOneOptions<ChannelEntity> : FindManyOptions<ChannelEntity>;

    constructor(options: ChannelQueryOptions<T>) {
        super();
        Object.assign(this, options);
    }

    public static forPlatform(platform: Platform): ChannelQuery<false> {
        return new ChannelQuery({
            one: false,
            query: {
                where: {
                    platform,
                },
            },
        });
    }

    public static where<T extends boolean>(where: FindOptionsWhere<ChannelEntity>, one?: T): ChannelQuery<T> {
        return new ChannelQuery({
            one: one,
            query: { where },
        });
    }
}
