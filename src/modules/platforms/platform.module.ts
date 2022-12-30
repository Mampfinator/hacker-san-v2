import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnsureChannelHandler } from "./commands/ensure-channel.handler";
import { ChannelEntity } from "./models/channel.entity";
import { StreamEntity } from "./models/stream.entity";
import { QueryHandlers } from "./queries";
import { ChannelsHandler } from "./queries/channels.handler";

@Module({
    imports: [CqrsModule, TypeOrmModule.forFeature([ChannelEntity, StreamEntity])],
    providers: [EnsureChannelHandler, ChannelsHandler, ...QueryHandlers],
})
export class PlatformModule {}
