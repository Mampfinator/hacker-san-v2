import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StreamEntity } from "../../models/stream.entity";
import { PlatformBaseFindHandler } from "../platform.base-find.handler";
import { FindStreamQuery } from "./find-stream.query";

@QueryHandler(FindStreamQuery)
export class FindStreamHandler extends PlatformBaseFindHandler<StreamEntity> {
    constructor(
        @InjectRepository(StreamEntity)
        repository: Repository<StreamEntity>,
    ) {
        super(repository);
    }
}
