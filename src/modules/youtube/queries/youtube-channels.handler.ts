import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { ChannelsQueryResult } from "../../../modules/platforms/queries/channels.handler";
import { Repository } from "typeorm";
import { YouTubeChannel } from "../model/youtube-channel.entity";
import { YouTubeChannelsQuery } from "./youtube-channels.query";

@QueryHandler(YouTubeChannelsQuery)
export class YouTubeChannelsHandler
    implements IQueryHandler<YouTubeChannelsQuery>
{
    constructor(
        @InjectRepository(YouTubeChannel)
        private readonly channelRepo: Repository<YouTubeChannel>,
    ) {}

    async execute(_query: YouTubeChannelsQuery): Promise<ChannelsQueryResult> {
        const allChannels = await this.channelRepo.find();

        const channels = allChannels.map(channel => ({
            name: channel.channelName,
            id: channel.channelId,
            url: `https://www.youtube.com/channel/${channel.channelId}`,
        }));

        return {
            channels,
        };
    }
}
