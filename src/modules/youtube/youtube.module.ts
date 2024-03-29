import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { YouTubeCommandHandlers } from "./commands";
import { YouTubeCommunityPostCommandHandlers } from "./community-posts/commands";
import { YouTubeCommunityPostsRequestService } from "./community-posts/community-posts.request.service";
import { YouTubeCommunityPostsService } from "./community-posts/youtube-community-posts.service";
import { YouTubeListenHandler } from "./events/listen.handler";
import { YouTubeVideoCommandHandlers } from "./videos/commands";
import { SyncVideosHandler } from "./videos/commands/sync-videos.handler";
import { YouTubeFeedService } from "./videos/feed/youtube-feed.service";
import { YouTubeEventSubService } from "./videos/youtube-eventsub.service";
import { YouTubeVideosService } from "./videos/youtube-video.service";
import { YouTubeVideosController } from "./videos/youtube-videos.controller";
import { YouTubeApiService } from "./youtube-api.service";
import { YouTubeService } from "./youtube.service";

@Module({
    imports: [ScheduleModule, CqrsModule],
    providers: [
        YouTubeService,
        YouTubeApiService,
        YouTubeCommunityPostsService,
        YouTubeCommunityPostsRequestService,
        ...YouTubeCommunityPostCommandHandlers,
        YouTubeEventSubService,
        YouTubeVideosService,
        ...YouTubeCommandHandlers,
        ...YouTubeVideoCommandHandlers,
        SyncVideosHandler,
        YouTubeListenHandler,
        YouTubeFeedService,
    ],
    controllers: [YouTubeVideosController],
    exports: [YouTubeService],
})
export class YouTubeModule {}
