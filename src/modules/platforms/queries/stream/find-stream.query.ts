import { FindOptionsWhereProperty } from "typeorm";
import { StreamEntity } from "../../models/stream.entity";
import { PlatformBaseFindQuery } from "../platform.base-find.query";

export class FindStreamQuery<One extends boolean> extends PlatformBaseFindQuery<StreamEntity, One> {
    public forStatus(status: FindOptionsWhereProperty<NonNullable<StreamEntity["status"]>>): this {
        this.internalWhere.status = status;
        return this;
    }
}
