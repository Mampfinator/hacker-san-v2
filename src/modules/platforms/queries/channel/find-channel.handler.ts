import { QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChannelEntity } from "../../models/channel.entity";
import { PlatformBaseFindHandler } from "../platform.base-find.handler";
import { FindChannelQuery } from "./find-channel.query";

@QueryHandler(FindChannelQuery)
export class FindChannelHandler extends PlatformBaseFindHandler<ChannelEntity> {
    constructor(
        @InjectRepository(ChannelEntity)
        repository: Repository<ChannelEntity>,
    ) {
        super(repository);
    }
}
