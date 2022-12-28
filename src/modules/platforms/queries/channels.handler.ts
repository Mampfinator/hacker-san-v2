import { ICommand, IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { TwitterChannelsQuery } from "../../../modules/twitter/queries/twitter-channels.query";
import { YouTubeChannelsQuery } from "../../../modules/youtube/queries/youtube-channels.query";
import { ChannelsQuery } from "./channels.query";

export interface ChannelsQueryResult {
    channels: {
        id: string;
        name: string;
        url: string;
    }[];
}

@QueryHandler(ChannelsQuery)
export class ChannelsHandler implements IQueryHandler<ChannelsQuery> {
    constructor(private readonly queryBus: QueryBus) {}

    async execute({ platform }: ChannelsQuery): Promise<ChannelsQueryResult> {
        let result: ChannelsQueryResult;

        switch (platform) {
            case "twitter":
                result = await this.queryBus.execute<
                    ICommand,
                    ChannelsQueryResult
                >(new TwitterChannelsQuery());
                break;
            case "youtube":
                result = await this.queryBus.execute<
                    ICommand,
                    ChannelsQueryResult
                >(new YouTubeChannelsQuery());
                break;
            default:
                throw new Error(
                    `Unexpected platform in GetChannelsHandler: ${platform}`,
                );
        }

        return result;
    }
}
