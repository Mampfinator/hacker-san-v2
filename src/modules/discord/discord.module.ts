import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionOrchestrator } from "./actions/action.orchestrator";
import { actionTypeFactory } from "./actions/actions-helper";
import { StreamDiscordChannelMap } from "./actions/model/stream-thread-map.entity";
import { ActionTypes } from "./actions/types";
import { getCommands } from "./slash-commands/slash-command";
import { slashcommandFactory } from "./slash-commands/slash-commands.provider";
import { DiscordClientService } from "./client/discord-client.service";
import { DiscordRESTService } from "./discord-rest.service";
import { DiscordService } from "./discord.service";
import { ActionDescriptor } from "./models/action.entity";
import { GuildSettings } from "./models/settings.entity";
import { EventHandlers } from "./actions/events";

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([GuildSettings, ActionDescriptor, StreamDiscordChannelMap]),
        CqrsModule,
    ],
    providers: [
        DiscordService,
        DiscordRESTService,
        DiscordClientService,
        ActionOrchestrator,
        ...EventHandlers,
        slashcommandFactory,
        ...getCommands(),
        ...ActionTypes,
        actionTypeFactory,
    ],
    exports: [DiscordClientService],
})
export class DiscordModule {}
