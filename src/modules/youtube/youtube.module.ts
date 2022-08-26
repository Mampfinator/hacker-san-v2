import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { YouTubeCommandHandlers } from "./commands";
import { CommunityPost } from "./community-posts/model/community-post.entity";
import { YouTubeCommunityPostsService } from "./community-posts/youtube-community-posts.service";
import { YouTubeListenHandler } from "./events/listen.handler";
import { YouTubeChannel } from "./model/youtube-channel.entity";
import { YouTubeVideo } from "./model/youtube-video.entity";
import { YouTubeChannelsHandler } from "./queries/youtube-channels.handler";
import { YouTubeVideoCommandHandlers } from "./videos/commands";
import { SyncVideosHandler } from "./videos/commands/sync-videos.handler";
import { YouTubeEventSubService } from "./videos/youtube-eventsub.service";
import { YouTubeVideosService } from "./videos/youtube-video.service";
import { YouTubeVideosController } from "./videos/youtube-videos.controller";
import { YouTubeApiService } from "./youtube-api.service";
import { YouTubeService } from "./youtube.service";

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
