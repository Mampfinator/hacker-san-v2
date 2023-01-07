import { IQueryHandler } from "@nestjs/cqrs";
import { Repository } from "typeorm";
import { ConditionalMultiple } from "../../../util";
import { IPlatformObject } from "../platform.interfaces";
import { IPlatformFindQuery } from "./platform.base-find.query";

export class PlatformBaseFindHandler<TEntity extends IPlatformObject>
    implements IQueryHandler<IPlatformFindQuery<TEntity, boolean>>
{
    constructor(private readonly repository: Repository<TEntity>) {}

    async execute<One extends boolean>({
        one,
        query,
    }: IPlatformFindQuery<TEntity, One>): Promise<ConditionalMultiple<One, TEntity>> {
        if (one) {
            return this.repository.findOne(query) as any;
        } else {
            return this.repository.find(query) as any;
        }
    }
}
