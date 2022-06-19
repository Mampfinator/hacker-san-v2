import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { EnsureChannelHandler } from "./commands/ensure-channel.handler";

@Module({
    imports: [CqrsModule],
    providers: [EnsureChannelHandler],
})
export class SharedModule {}
