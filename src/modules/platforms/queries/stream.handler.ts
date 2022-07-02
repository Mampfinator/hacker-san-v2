import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StreamEntity } from "../models/stream.entity";
import { StreamQuery } from "./stream.query";

@QueryHandler(StreamQuery)
export class StreamQueryHandler implements IQueryHandler<StreamQuery> {
    constructor(
        @InjectRepository(StreamEntity)
        private readonly streamRepository: Repository<StreamEntity>,
    ) {}

    async execute({
        options,
    }: StreamQuery): Promise<StreamEntity | StreamEntity[]> {
        const { platform, platformId, query } = options;
        let { one } = options;

        let streamQuery: Record<string, any>;

        if (platform && platformId) {
            streamQuery = {
                where: {
                    platform,
                    platformId,
                },
            };

            one = true;
        } else {
            streamQuery = query;
        }
        return this.streamRepository[one ? "findOne" : "find"](streamQuery);
    }
}
