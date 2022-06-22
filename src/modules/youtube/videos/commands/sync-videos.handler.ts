import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { YouTubeVideo } from "../../model/youtube-video.entity";
import { YouTubeApiService } from "../../youtube-api.service";
import { YouTubeVideosService } from "../youtube-video.service";
import { SyncVideosCommand } from "./sync-videos.command";

@CommandHandler(SyncVideosCommand)
export class SyncVideosHandler implements ICommandHandler<SyncVideosCommand> {
    private readonly logger = new Logger(SyncVideosHandler.name);

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
        const videoIds = playlistData.items.map(
            item => item.snippet.resourceId.videoId,
        );
        const { data: videoData } = await this.api.videos.list({
            id: videoIds,
            part: ["snippet", "liveStreamingDetails"],
            maxResults: 50,
        });
        const { items: videos } = videoData;

        for (const video of videos) {
            const { id } = video;
            const status = this.videoService.getStatus(video);

            if (status !== "offline") {
                // we don't particularly care about past uploads & offline streams; save some space on the poor DB.
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
