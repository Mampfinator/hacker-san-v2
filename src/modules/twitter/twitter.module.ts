import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TwitterSpace } from "./models/twitter-space.entity";
import { TwitterUser } from "./models/twitter-user.entity";
import { GetSpacesHandler } from "./requests/get-spaces.handler";
import { TwitterSpacesService } from "./spaces/twitter-spaces.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([TwitterUser, TwitterSpace]),
        CqrsModule
    ],
    providers: [
        TwitterSpacesService,
        GetSpacesHandler
    ]
})
export class TwitterModule {}