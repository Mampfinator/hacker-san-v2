import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler, QueryBus } from "@nestjs/cqrs";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { YouTubeApiService } from "../../youtube-api.service";
import { YOUTUBE_VIDEO_FEED_URL } from "../constants";
import { YouTubeFeedService } from "../feed/youtube-feed.service";
import { YouTubeVideosService } from "../youtube-video.service";
import { SyncVideosCommand } from "./sync-videos.command";

// TODO: reimplement
// Since this is meant to sync *all* videos on a channel, we can just make it use the scraper.
@CommandHandler(SyncVideosCommand)
export class SyncVideosHandler implements ICommandHandler<SyncVideosCommand> {
    constructor() {}

    async execute({ channelId }: SyncVideosCommand): Promise<any> {}
}
