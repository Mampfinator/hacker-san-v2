import { ExceptionFilter, Catch, ArgumentsHost, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseExceptionFilter } from "@nestjs/core";
import { MessageEmbed } from "discord.js";
import { DiscordConfig } from "./modules/config/config";
import { DiscordClientService } from "./modules/discord/client/discord-client.service";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);
    private readonly sendDm: boolean;
    private readonly ownerId?: string;

    constructor(
        private readonly client: DiscordClientService,
        config: ConfigService
    ) {
        const {dmOwnerOnError, ownerId} = config.get<DiscordConfig>("DISCORD");
        this.sendDm = ownerId && dmOwnerOnError;
        this.ownerId = ownerId;
    }
    
    async catch(exception: any, host: ArgumentsHost) {
        const errorText = exception?.toString?.() ?? exception ?? "Unknown error.";
        
        this.logger.error(errorText);
        if (this.sendDm) 
        {
            const embed = new MessageEmbed()
                .setColor("DARK_RED")
                .setTitle(`Uncaught Exception: ${(exception as Error).name}`)
                .setDescription(errorText);
            if ((exception as Error).stack) embed.addField("Traceback", `\`\`\`${(exception as Error).stack.substring(0, 1994)}\`\`\``);

            (await this.client.users.fetch(this.ownerId)).send({
                embeds: [
                    embed
                ]
            });
        }
    }
}