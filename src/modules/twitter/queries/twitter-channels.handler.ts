import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { ChannelsQueryResult } from "src/modules/platforms/queries/channels.handler";
import { Repository } from "typeorm";
import { TwitterUser } from "../models/twitter-user.entity";
import { TwitterChannelsQuery } from "./twitter-channels.query";

@QueryHandler(TwitterChannelsQuery)
export class TwitterChannelsHandler
    implements IQueryHandler<TwitterChannelsQuery>
{
    constructor(
        @InjectRepository(TwitterUser)
        private readonly userRepo: Repository<TwitterUser>,
    ) {}

    async execute(query: TwitterChannelsQuery): Promise<ChannelsQueryResult> {
        const users = await this.userRepo.find();

        const channels = users.map(user => ({
            name: user.name,
            id: user.id,
            url: `https://twitter.com/${user.name}`,
        }));

        return {
            channels,
        };
    }
}
