import { IInferredQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChannelEntity } from "../models/channel.entity";
import { ChannelQuery } from "./channel.query";

@QueryHandler(ChannelQuery)
export class ChannelHandler
    implements IInferredQueryHandler<ChannelQuery>
{
    constructor(
        @InjectRepository(ChannelEntity)
        private readonly channelRepository: Repository<ChannelEntity>,
    ) {}

    async execute<T extends boolean>({
        one,
        query,
    }: ChannelQuery<T>): Promise<
        T extends true ? ChannelEntity : ChannelEntity[]
    > {
        // workaround because
        if (one) {
            return this.channelRepository.findOne(query) as any;
        } else {
            return this.channelRepository.find(query) as any;
        }
    }
}
