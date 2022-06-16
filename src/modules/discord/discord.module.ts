import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { getCommands } from "./client/slash-command";
import { DiscordClientService } from "./client/discord-client.service";
import { DiscordService } from "./discord.service";
import { DiscordCommandHandlers } from "./commands";
import { GuildSettings } from "./models/settings.entity";
import { Subscription } from "./models/subscription.entity";
import { CqrsModule } from "@nestjs/cqrs";
import { slashcommandFactory } from "./client/commands/slash-commands.provider";

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([GuildSettings, Subscription]),
        CqrsModule,
    ],
    providers: [
        DiscordService,
        DiscordClientService,
        slashcommandFactory,
        ...getCommands(),
        ...DiscordCommandHandlers
    ]
})
export class DiscordModule {}