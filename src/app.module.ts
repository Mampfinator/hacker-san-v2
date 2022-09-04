import {
    MiddlewareConsumer,
    Module,
    NestModule,
    RequestMethod,
} from "@nestjs/common";
import { RawBodyMiddleware } from "./shared/middleware/raw-body.middleware";
import { JsonBodyMiddleware } from "./shared/middleware/json-body.middleware";
import { ConfigModule, ConfigService } from "@nestjs/config";
import config from "./modules/config/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GuildSettings } from "./modules/discord/models/settings.entity";
import { YouTubeChannel } from "./modules/youtube/model/youtube-channel.entity";
import { CommunityPost } from "./modules/youtube/community-posts/model/community-post.entity";
import { YouTubeVideo } from "./modules/youtube/model/youtube-video.entity";
import { Action } from "./modules/discord/models/action.entity";
import { TwitterUser } from "./modules/twitter/models/twitter-user.entity";
import { TwitterSpace } from "./modules/twitter/models/twitter-space.entity";
import { ScheduleModule } from "@nestjs/schedule";
import { CqrsModule } from "@nestjs/cqrs";
import { DiscordModule } from "./modules/discord/discord.module";
import { PlatformModule } from "./modules/platforms/platform.module";
import { YouTubeModule } from "./modules/youtube";
import { TwitterModule } from "./modules/twitter/twitter.module";
import { AppService } from "./app.service";
import { Entities } from "./entities";
import { ChannelMigration1661942362285 } from "migrations/1661942362285-ChannelMigration";
import { Migrations } from "./migrations";
import { EventEmitterModule } from "@nestjs/event-emitter";

// General todo: frontend for managing actions because trying to do that with slash commands will only get you so far.
// Proper modals when Discord.

// More todo:
// - replace all platform-specific database models with the generic ones in src/modules/platforms/models/

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
                synchronize: false,
                entities: Entities,
                migrations: Migrations,
                migrationsRun: true,
            }),
            inject: [ConfigService],
        }),
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
        CqrsModule,
        DiscordModule,
        PlatformModule,
        YouTubeModule,
        TwitterModule,
    ],
    providers: [AppService],
})
export class AppModule implements NestModule {
    public configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RawBodyMiddleware)
            .forRoutes({
                path: "/youtube/eventsub",
                method: RequestMethod.ALL,
            })
            .apply(JsonBodyMiddleware)
            .forRoutes("*");
    }
}
