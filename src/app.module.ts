import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from "@nestjs/schedule";
import { AppService } from './app.service';
import config from "src/modules/config/config";
import { DiscordModule } from './modules/discord/discord.module';
import { GuildSettings } from './modules/discord/models/settings.entity';
import { YouTubeModule } from './modules/youtube/youtube.module';
import { YouTubeChannel } from './modules/youtube/model/youtube-channel.entity';
import { CommunityPost } from './modules/youtube/community-posts/model/community-post.entity';
import { RawBodyMiddleware } from './shared/middleware/raw-body.middleware';
import { JsonBodyMiddleware } from './shared/middleware/json-body.middleware';
import { YouTubeVideo } from './modules/youtube/model/youtube-video.entity';
import { Subscription } from './modules/discord/models/subscription.entity';
import { TwitterSpace } from './modules/twitter/models/twitter-space.entity';
import { TwitterModule } from './modules/twitter/twitter.module';
import { TwitterUser } from './modules/twitter/models/twitter-user.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      ignoreEnvFile: true,
      ignoreEnvVars: true, 
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.get<string>("DATABASE_URL"),
        synchronize: true,
        entities: [
          GuildSettings,
          YouTubeChannel,
          CommunityPost,
          YouTubeVideo,
          Subscription,
          TwitterUser,
          TwitterSpace
        ]
      }),
      inject: [ConfigService]
    }),
    ScheduleModule.forRoot(),
    DiscordModule,
    YouTubeModule,
    TwitterModule
  ],
  providers: [
    AppService
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes(
        {
          path: "/youtube/eventsub",
          method: RequestMethod.ALL
        }
      )
      .apply(JsonBodyMiddleware)
      .forRoutes('*')
  }
}
