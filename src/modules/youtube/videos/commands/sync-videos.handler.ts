import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { Repository } from "typeorm";
import { YouTubeVideo } from "../../model/youtube-video.entity";
import { YouTubeApiService } from "../../youtube-api.service";
import { YOUTUBE_VIDEO_FEED_URL } from "../constants";
import { YouTubeVideosService } from "../youtube-video.service";
import { SyncVideosCommand } from "./sync-videos.command";

@CommandHandler(SyncVideosCommand)
export class SyncVideosHandler implements ICommandHandler<SyncVideosCommand> {
    private readonly logger = new Logger(SyncVideosHandler.name);
    private readonly xmlParser = new XMLParser();

    constructor(
        @InjectRepository(YouTubeVideo)
        public readonly videoRepo: Repository<YouTubeVideo>,
        private readonly api: YouTubeApiService,
        private readonly videoService: YouTubeVideosService,
    ) {}

    async execute({ channelId }: SyncVideosCommand): Promise<any> {
        const { data: playlistData } = await this.api.playlistItems.list({
            playlistId: `UU${channelId.substring(2)}`,
            part: ["id", "snippet"],
            maxResults: 50,
        });

        const { data: rawXml } = await axios.get(`${YOUTUBE_VIDEO_FEED_URL}?channel_id=${channelId}`);
        const xml = this.xmlParser.parse(rawXml);
        const xmlVideoIds = xml.feed.entry.map(entry => entry["yt:videoId"]);

        const videoIds = [...xmlVideoIds, ...playlistData.items.map(
            item => item.snippet.resourceId.videoId,
        )].filter(id => id);

        const { data: videoData } = await this.api.videos.list({
            id: [...new Set(videoIds)].slice(0, 50),
            part: ["snippet", "liveStreamingDetails"],
            maxResults: 50,
        });
        const { items: videos } = videoData;

        for (const video of videos) {
            const { id } = video;
            const status = this.videoService.getStatus(video);


            if (status !== "offline") {
                // we don't particularly care about past uploads & offline streams; save some space on the poor DB.
                this.logger.debug(`Found ${status} video: ${id}`);
                await this.videoRepo.save({
                    id,
                    status,
                    channelId,
                });
            } else {
                // for edge-cases like upcoming -> offline (deleted) changes
                await this.videoRepo.update(
                    {
                        id,
                    },
                    {
                        status,
                    },
                );
            }
        }
    }
}
