import { Query } from "@nestjs-architects/typed-cqrs";
import { InsertResult } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { IPlatformObject } from "../platform.interfaces";

export class PlatformBaseInsertQuery<TEntity extends IPlatformObject> extends Query<InsertResult> {
    constructor(public readonly entity: QueryDeepPartialEntity<TEntity> | QueryDeepPartialEntity<TEntity>[]) {
        super();
    }
}
