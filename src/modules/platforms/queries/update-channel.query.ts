import { Query } from "@nestjs-architects/typed-cqrs";
import { FindOptionsWhere, UpdateResult } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { ChannelEntity } from "../models/channel.entity";

export class UpdateChannelQuery extends Query<UpdateResult> {
    constructor(
        /**
         * Which rows to update
         */
        public readonly criteria:
            | string
            | number
            | string[]
            | Date
            | number[]
            | Date[]
            | FindOptionsWhere<ChannelEntity>,
            /**
             * Which updates to apply to those rows.
             */
        public readonly update: QueryDeepPartialEntity<ChannelEntity>,
    ) {
        super();
    }
}
