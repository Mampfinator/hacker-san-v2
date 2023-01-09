import "./src/polyfill"; // make sure Action type enum has been generated and populated..

import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import config from "./src/modules/config/config";
import { Entities } from "./src/entities";
import { Migrations } from "./src/migrations";
import { getActions, getActionType } from "./src/modules/discord/actions/decorators/action";


const configService = new ConfigService(config());

export default new DataSource({
    type: "postgres",
    url: configService.getOrThrow<string>("DATABASE_URL"),
    entities: Entities,
    migrations: Migrations
});