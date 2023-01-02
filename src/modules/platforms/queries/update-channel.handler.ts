import { IInferredQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, UpdateResult } from "typeorm";
import { ChannelEntity } from "../models/channel.entity";
import { UpdateChannelQuery } from "./update-channel.query";

/**
 * Run an update query on the channel repository.
 */
@QueryHandler(UpdateChannelQuery)
export class UpdateChannelHandler implements IInferredQueryHandler<UpdateChannelQuery> {
    constructor(@InjectRepository(ChannelEntity) private readonly channelRepo: Repository<ChannelEntity>) {}

    async execute({ criteria, update }: UpdateChannelQuery): Promise<UpdateResult> {
        return this.channelRepo.update(criteria, update);
    }
}
