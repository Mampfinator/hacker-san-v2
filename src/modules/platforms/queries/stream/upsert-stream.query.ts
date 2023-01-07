import { Query } from "@nestjs-architects/typed-cqrs";
import { DeepPartial, InsertResult } from "typeorm";
import { StreamEntity } from "../../models/stream.entity";

export class UpsertStreamQuery extends Query<InsertResult> {
    constructor(public readonly stream: DeepPartial<StreamEntity> | DeepPartial<StreamEntity>[]) {
        super();
    }
}
