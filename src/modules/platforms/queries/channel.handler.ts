import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChannelEntity } from "../models/channel.entity";
import { ChannelQuery } from "./channel.query";

@QueryHandler(ChannelQuery)
export class ChannelQueryHandler implements IQueryHandler<ChannelQuery> {
    constructor(
        @InjectRepository(ChannelEntity) private readonly channelRepository: Repository<ChannelEntity>
    ) {}
    
    
    async execute({options}: ChannelQuery): Promise<ChannelEntity | ChannelEntity[]> {
        const {platform, platformId, query} = options;
        let {one} = options;

        let channelQuery: Record<string, any>;


        if (platform && platformId) {
            channelQuery = {
                where: {
                    platform,
                    platformId,
                }
            }

            one = true;
        } else {
            channelQuery = query;
        }
        return this.channelRepository[one ? "findOne" : "find"](channelQuery);
    }
}