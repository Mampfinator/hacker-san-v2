import "./polyfill";

import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { AppService } from "./app.service";
import { DiscordClientService } from "./modules/discord/client/discord-client.service";
import { GlobalExceptionFilter } from "./global-exception.filter";

let exceptionFilter: GlobalExceptionFilter;

(async () => {
    const app = await NestFactory.create(AppModule, { bodyParser: false });

    const config = app.get(ConfigService);
    const discordClientService = app.get(DiscordClientService);
    
    exceptionFilter = new GlobalExceptionFilter(discordClientService, config);
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
    console.log(`Got uncaught exception: ${error.toString?.() ?? error}`);
    exceptionFilter.catch(error, null)
});
process.on("unhandledRejection", reason => {
    console.log(`Got unhandled rejection: ${reason}`);
    exceptionFilter.catch(reason, null)
});