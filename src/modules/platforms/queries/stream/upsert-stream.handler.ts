import { IInferredQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StreamEntity } from "../../models/stream.entity";
import { UpsertStreamQuery } from "./upsert-stream.query";

@QueryHandler(UpsertStreamQuery)
export class UpsertStreamHandler implements IInferredQueryHandler<UpsertStreamQuery> {
    constructor(@InjectRepository(StreamEntity) private readonly repository: Repository<StreamEntity>) {}

    execute({ stream }: UpsertStreamQuery) {
        return this.repository
            .createQueryBuilder()
            .insert()
            .into(StreamEntity)
            .values(stream)
<<<<<<< HEAD
            .orUpdate(["status"], "PLATFORM_ID_UNIQUE")
=======
            .orUpdate(["platformId", "id"], ["status"])
>>>>>>> c4f6a92 (Removed YouTubeVideo entity)
            .execute();
    }
}
