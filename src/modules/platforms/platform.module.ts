import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnsureChannelHander } from "./commands/ensure-channel.handler";
import { ChannelEntity } from "./models/channel.entity";
import { PostEntity } from "./models/post.entity";
import { StreamEntity } from "./models/stream.entity";
import { QueryHandlers } from "./queries";

@Module({
    imports: [
        CqrsModule,
        TypeOrmModule.forFeature([ChannelEntity, StreamEntity, PostEntity]),
    ],
    providers: [EnsureChannelHander, ...QueryHandlers],
})
export class PlatformModule {}
