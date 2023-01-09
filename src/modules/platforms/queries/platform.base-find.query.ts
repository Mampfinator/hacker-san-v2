import { Query } from "@nestjs-architects/typed-cqrs";
import { FindManyOptions, FindOneOptions, FindOptionsWhere, FindOptionsWhereProperty } from "typeorm";
import { ConditionalMultiple } from "../../../util";
import { IPlatformObject } from "../platform.interfaces";

export interface IPlatformFindQuery<TEntity extends IPlatformObject, One extends boolean = false> {
    readonly one: One;
    readonly query: One extends true ? FindOneOptions<TEntity> : FindManyOptions<TEntity>;
}

export interface BaseQueryOptions<TEntity extends IPlatformObject, One extends boolean = false> {
    one?: One;
    where?: FindOptionsWhere<TEntity>;
}

/**
 * Query and query builder for all platform entities.
 */
export class PlatformBaseFindQuery<
        TEntity extends IPlatformObject,
        One extends boolean = false,
        TReturn = ConditionalMultiple<One, TEntity>,
    >
    extends Query<TReturn>
    implements IPlatformFindQuery<TEntity, One>
{
    public one: One;
    public readonly query: Omit<One extends true ? FindOneOptions<TEntity> : FindManyOptions<TEntity>, "where"> & {
        where: FindOptionsWhere<TEntity>[];
    } = { where: [] } as any; // super hacky workaround; We want query.where to always be an array of find options rather than a single where.
    protected readonly internalWhere: FindOptionsWhere<TEntity>;

    constructor(options?: BaseQueryOptions<TEntity, One>) {
        super();
        this.one = options?.one ?? (false as One);
        this.internalWhere = options?.where ?? {};
        this.query.where.push(this.internalWhere);
    }

    public where(where: FindOptionsWhere<TEntity>): this {
        this.query.where.push(where);
        return this;
    }

    public forPlatform(platform: FindOptionsWhereProperty<NonNullable<TEntity["platform"]>>): this {
        this.internalWhere.platform = platform;
        return this;
    }

    public forId(platformId: FindOptionsWhereProperty<NonNullable<TEntity["platformId"]>>): this {
        this.internalWhere.platformId = platformId;
        return this;
    }

    public take(take: number): One extends false ? this : never {
        if (this.one) return;

        (this.query as FindManyOptions<TEntity>).take = take;
        return this as any;
    }
}
