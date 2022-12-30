import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnsureTwitterChannelHandler } from "./commands/ensure-twitter-channel.handler";
import { TwitterSpace } from "./models/twitter-space.entity";
import { TwitterUser } from "./models/twitter-user.entity";
import { TwitterChannelsHandler } from "./queries/twitter-channels.handler";
import { GetSpacesHandler } from "./requests/get-spaces.handler";
import { TwitterSpacesService } from "./spaces/twitter-spaces.service";
import { TwitterApiService } from "./twitter-api.service";

@Module({
    imports: [TypeOrmModule.forFeature([TwitterUser, TwitterSpace]), CqrsModule],
    providers: [
        TwitterApiService,
        TwitterSpacesService,
        GetSpacesHandler,
        EnsureTwitterChannelHandler,
        TwitterChannelsHandler,
    ],
})
export class TwitterModule {}
