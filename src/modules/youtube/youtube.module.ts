import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CqrsModule } from "@nestjs/cqrs";
import { CommunityPost } from "./community-posts/model/community-post.entity";
import { YouTubeChannel } from "./model/youtube-channel.entity";
import { YouTubeCommunityPostsService } from "./community-posts/youtube-community-posts.service";
import { YouTubeEventSubService } from "./videos/youtube-eventsub.service";
import { YouTubeVideosService } from "./videos/youtube-video.service";
import { YouTubeVideoCommandHandlers } from "./videos/commands";
import { YouTubeVideosController } from "./videos/youtube-videos.controller";
import { YouTubeVideo } from "./model/youtube-video.entity";
import { YouTubeService } from "./youtube.service";
import { YouTubeApiService } from "./youtube-api.service";
import { SyncVideosHandler } from "./videos/commands/sync-videos.handler";
import { YouTubeListenHandler } from "./events/listen.handler";
import { YouTubeChannelsHandler } from "./queries/youtube-channels.handler";
import { YouTubeCommandHandlers } from "./commands";

@Module({
    imports: [
        TypeOrmModule.forFeature([YouTubeChannel, CommunityPost, YouTubeVideo]),
        ScheduleModule,
        CqrsModule,
    ],
    providers: [
        YouTubeService,
        YouTubeApiService,
        YouTubeCommunityPostsService,
        YouTubeEventSubService,
        YouTubeVideosService,
        ...YouTubeCommandHandlers,
        ...YouTubeVideoCommandHandlers,
        SyncVideosHandler,
        YouTubeListenHandler,
        YouTubeChannelsHandler,
    ],
    controllers: [YouTubeVideosController],
    exports: [YouTubeService],
})
export class YouTubeModule {}
