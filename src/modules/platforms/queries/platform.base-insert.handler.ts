import { IInferredQueryHandler } from "@nestjs/cqrs";
import { InsertResult, Repository } from "typeorm";
import { IPlatformObject } from "../platform.interfaces";
import { PlatformBaseInsertQuery } from "./platform.base-insert-query";

export class PlatformBaseInsertHandler<TEntity extends IPlatformObject>
    implements IInferredQueryHandler<PlatformBaseInsertQuery<TEntity>>
{
    constructor(private readonly repository: Repository<TEntity>) {}

    async execute({ entity }: PlatformBaseInsertQuery<TEntity>): Promise<InsertResult> {
        return this.repository.insert(entity);
    }
}
