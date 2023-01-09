import { QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { InsertResult, Repository } from "typeorm";
import { ChannelEntity } from "../../models/channel.entity";
import { PlatformBaseInsertHandler } from "../platform.base-insert.handler";
import { InsertChannelQuery } from "./insert-channel.query";

@QueryHandler(InsertChannelQuery)
export class InsertChannelHandler extends PlatformBaseInsertHandler<ChannelEntity> {
    constructor(@InjectRepository(ChannelEntity) repository: Repository<ChannelEntity>) {
        super(repository);
    }

    public async execute(query: InsertChannelQuery): Promise<InsertResult> {
        // TODO: verify platform ID, sync & then insert.

        return super.execute(query);
    }
}
