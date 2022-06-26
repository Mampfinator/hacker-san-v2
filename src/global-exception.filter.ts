import { HttpException, HttpServer } from "@nestjs/common";
import { ExceptionFilter, Catch, ArgumentsHost, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseExceptionFilter } from "@nestjs/core";
import { DiscordAPIError, MessageEmbed } from "discord.js";
import { DiscordConfig } from "./modules/config/config";
import { DiscordClientService } from "./modules/discord/client/discord-client.service";
import { codeBlock } from "@discordjs/builders";


@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);
    private readonly sendDm: boolean;
    private readonly ownerId?: string;

    private readonly ignoreChecks: ((exception: any) => boolean)[] = [];

    constructor(
        applicationRef: HttpServer<any, any>,
        private readonly client: DiscordClientService,
        config: ConfigService,
    ) {
        super(applicationRef);
        const { dmOwnerOnError, ownerId } =
            config.get<DiscordConfig>("DISCORD");
        this.sendDm = ownerId && dmOwnerOnError;
        this.ownerId = ownerId;
    }

    ignore(...checks: ((exception: any) => boolean)[]): this {
        this.ignoreChecks.push(...checks);
        return this;
    }


    async catch(exception: any, host?: ArgumentsHost) {
        if (host) super.catch(exception, host);
        const ignore = this.ignoreChecks.some(check => check(exception));
        if (ignore) return;

        const errorText =
        exception?.toString?.() ?? exception ?? "Unknown error.";
        this.logger.error(errorText);

        const sendDm = this.sendDm && !ignore;

        if (sendDm) {
            const embed = new MessageEmbed()
                .setColor("DARK_RED")
                .setTitle(
                    `Uncaught Exception: ${
                        (exception as Error).name ?? "Unknown error type."
                    }`,
                )
                .setDescription(errorText);
            if ((exception as Error).stack) {
                const newLines = (exception as Error).stack.split("\n");

                let i = 0;
                let traces: string[] = [];

                for (const line of newLines) {
                    if (!traces[i]) traces[i] = "";
                    const trace = traces[i];
                    
                    if (trace.length + line.length < 1017) {
                        traces[i] = trace + line + "\n";
                    } else {
                        i++;
                        traces[i] = line + "\n";
                    }
                }

                if (traces.length == 1) {
                    embed.addField("Stacktrace", codeBlock(traces[0]));
                } else {
                    for (let traceIndex = 0; traceIndex < traces.length; traceIndex++) {
                        embed.addField(
                            `Stacktrace ${traceIndex + 1}`,
                            codeBlock(traces[traceIndex]),
                        );
                    }
                }
            }

            (await this.client.users.fetch(this.ownerId)).send({
                embeds: [embed],
            });
        }
    }
}
