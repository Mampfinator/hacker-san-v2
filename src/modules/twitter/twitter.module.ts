import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnsureTwitterChannelHandler } from "./commands/ensure-twitter-channel.handler";
import { TwitterSpace } from "./models/twitter-space.entity";
import { GetSpacesHandler } from "./requests/get-spaces.handler";
import { TwitterSpacesService } from "./spaces/twitter-spaces.service";
import { TwitterApiService } from "./twitter-api.service";

@Module({
    imports: [TypeOrmModule.forFeature([TwitterSpace]), CqrsModule],
    providers: [
        TwitterApiService,
        TwitterSpacesService,
        GetSpacesHandler,
        EnsureTwitterChannelHandler,
    ],
})
export class TwitterModule {}
