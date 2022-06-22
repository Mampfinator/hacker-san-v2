import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { getCommands } from "./client/commands/slash-command";
import { DiscordClientService } from "./client/discord-client.service";
import { DiscordService } from "./discord.service";
import { DiscordCommandHandlers } from "./commands";
import { GuildSettings } from "./models/settings.entity";
import { Action } from "./models/action.entity";
import { CqrsModule } from "@nestjs/cqrs";
import { slashcommandFactory } from "./client/commands/slash-commands.provider";
import { getActions } from "./actions/action";
import { actionTypeFactory } from "./actions/actions-helper";

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([GuildSettings, Action]),
        CqrsModule,
    ],
    providers: [
        DiscordService,
        DiscordClientService,
        slashcommandFactory,
        ...getCommands(),
        ...getActions(),
        actionTypeFactory,
        ...DiscordCommandHandlers,
    ],
    exports: [DiscordClientService],
})
export class DiscordModule {}
