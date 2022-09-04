import {DataSource} from "typeorm";
import {ConfigService} from "@nestjs/config";
import config from "./src/modules/config/config";
import { Entities } from "./src/entities";
import { ChannelMigration1661942362285 } from "./migrations/1661942362285-ChannelMigration";
import { Migrations } from "src/migrations";

const configService = new ConfigService(config());

export default new DataSource({
    type: "postgres",
    url: configService.getOrThrow<string>("DATABASE_URL"),
    entities: Entities,
    migrations: Migrations
});