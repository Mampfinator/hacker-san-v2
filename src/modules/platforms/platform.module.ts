import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { EnsureChannelHandler } from "./commands/ensure-channel.handler";
import { ChannelsHandler } from "./queries/channels.handler";

@Module({
    imports: [CqrsModule],
    providers: [EnsureChannelHandler, ChannelsHandler],
})
export class PlatformModule {}
