import { Logger } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StreamEntity } from "../models/stream.entity";
import { InsertStreamQuery } from "./insert-stream.query";

@QueryHandler(InsertStreamQuery)
export class InsertStreamHandler implements IQueryHandler<InsertStreamQuery> {
    private readonly logger = new Logger(InsertStreamHandler.name);

    constructor(
        @InjectRepository(StreamEntity)
        private readonly streamRepo: Repository<StreamEntity>
    ) {}
    
    async execute(query: InsertStreamQuery): Promise<boolean> {
        const result = await this.streamRepo.insert(query.stream).catch(error => this.logger.error(error, error.stack));
        return typeof result !== "undefined";
    }
}