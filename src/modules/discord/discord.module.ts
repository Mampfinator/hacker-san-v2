import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionOrchestrator } from "./actions/action.orchestrator";
import { actionTypeFactory } from "./actions/actions-helper";
import { StreamDiscordChannelMap } from "./actions/model/stream-thread-map.entity";
import { ActionTypes } from "./actions/types";
import { DiscordClientService } from "./discord-client.service";
import { DiscordRESTService } from "./discord-rest.service";
import { DiscordService } from "./discord.service";
import { ActionDescriptor } from "./models/action.entity";
import { GuildSettings } from "./models/settings.entity";
import { EventHandlers } from "./actions/events";
import { DiscoveryModule } from "@nestjs-plus/discovery";
import { SlashCommandDiscovery } from "./slash-command/slash-command.discovery";
import { SlashCommandDispatcher } from "./slash-command/slash-command.dispatcher";
import { SlashCommands } from "./slash-command/types";

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([GuildSettings, ActionDescriptor, StreamDiscordChannelMap]),
        CqrsModule,
        DiscoveryModule,
    ],
    providers: [
        DiscordService,
        DiscordRESTService,
        DiscordClientService,
        ActionOrchestrator,
        ...EventHandlers,
        ...ActionTypes,
        actionTypeFactory,
        SlashCommandDiscovery,
        SlashCommandDispatcher,
        ...SlashCommands,
    ],
    exports: [DiscordClientService],
})
export class DiscordModule {}
