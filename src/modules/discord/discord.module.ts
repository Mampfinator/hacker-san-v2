import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { actionTypeFactory } from "./actions/actions-helper";
import { ActionTypes } from "./actions/types";
import { getCommands } from "./client/commands/slash-command";
import { slashcommandFactory } from "./client/commands/slash-commands.provider";
import { DiscordClientService } from "./client/discord-client.service";
import { DiscordCommandHandlers } from "./commands";
import { DiscordRESTService } from "./discord-rest.service";
import { DiscordService } from "./discord.service";
import { Action } from "./models/action.entity";
import { GuildSettings } from "./models/settings.entity";

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([GuildSettings, Action]),
        CqrsModule,
    ],
    providers: [
        DiscordService,
        DiscordRESTService,
        DiscordClientService,
        slashcommandFactory,
        ...getCommands(),
        ...ActionTypes,
        actionTypeFactory,
        ...DiscordCommandHandlers,
    ],
    exports: [DiscordClientService],
})
export class DiscordModule {}
