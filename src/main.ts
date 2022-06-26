import "./polyfill";

import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpException, Logger } from "@nestjs/common";
import { AppService } from "./app.service";
import { DiscordClientService } from "./modules/discord/client/discord-client.service";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { DiscordAPIError } from "discord.js";

let exceptionFilter: GlobalExceptionFilter;

(async () => {
    const app = await NestFactory.create(AppModule, { bodyParser: false });

    const config = app.get(ConfigService);
    const discordClientService = app.get(DiscordClientService);

    const {httpAdapter} = app.get(HttpAdapterHost);

    exceptionFilter = new GlobalExceptionFilter(
        httpAdapter, 
        discordClientService, 
        config
    ).ignore(
        exception => exception instanceof HttpException,
        exception => exception instanceof DiscordAPIError
    );

    app.useGlobalFilters(exceptionFilter);

    const logger = new Logger("Bootstrap");
    await app.listen(config.getOrThrow("PORT"));

    logger.log(
        `App started. Listening on port ${config.get(
            "PORT",
        )}. Requests expected at ${config.get("URL")}`,
    );

    const appService = app.get(AppService);
    appService.triggerListen();
})();


// Yes, I'm going to assume resuming the application is fine.
// No, I don't really care if this is "best practice" or not. :)
process.on("uncaughtException", error => {
    exceptionFilter.catch(error, null);
});
process.on("unhandledRejection", reason => {
    exceptionFilter.catch(reason, null);
});
