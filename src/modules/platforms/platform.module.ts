import { DynamicModule, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { TwitterConfig, YouTubeConfig } from "../config/config";
import { EnsureChannelHandler } from "./commands/ensure-channel.handler";
import { ChannelsHandler } from "./queries/channels.handler";

@Module({
    imports: [CqrsModule],
    providers: [EnsureChannelHandler, ChannelsHandler],
})
export class PlatformModule {}
