import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommunityPost } from "./community-posts/model/community-post.entity";
import { YouTubeChannel } from "./model/youtube-channel.entity";
import { CqrsModule } from "@nestjs/cqrs";
import { YouTubeCommunityPostsService } from "./community-posts/youtube-community-posts.service";
import { YouTubeEventSubService } from "./videos/youtube-eventsub.service";
import { YouTubeVideosService } from "./videos/youtube-video.service";
import { YouTubeCommandHandlers } from "./videos/commands";
import { YouTubeVideosController } from "./videos/youtube-videos.controller";
import { YouTubeVideo } from "./model/youtube-video.entity";
import { YouTubeService } from "./youtube.service";
import { EnsureYouTubeChannelHandler } from "./commands/ensure-youtube-channel.handler";
import { YouTubeApiService } from "./youtube-api.service";

//TODO: refactor; YouTubeAPIService that extends youtube_v3.Youtube (if possible...?)

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
        EnsureYouTubeChannelHandler,
    ],
    controllers: [YouTubeVideosController],
    exports: [YouTubeService],
})
export class YouTubeModule {}
