import "./polyfill";

import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

(async () => {
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    const config = app.get(ConfigService);

    const logger = new Logger("Bootstrap");
    await app.listen(config.getOrThrow("PORT"));

    logger.log(
        `App started. Listening on port ${config.get(
            "PORT",
        )}. Requests expected at ${config.get("URL")}`,
    );
})();
