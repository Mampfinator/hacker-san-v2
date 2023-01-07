import { InitialMigration1661942360000 } from "../migrations/1661942360000-InitialMigration";
import { ChannelMigration1661942362285 } from "../migrations/1661942362285-ChannelMigration";
import { migrations1672455145161 } from "../migrations/1672455145161-migrations";
import { migrations1673095216478 } from "../migrations/1673095216478-migrations";

export const Migrations = [
    InitialMigration1661942360000,
    ChannelMigration1661942362285,
    migrations1672455145161,
    migrations1673095216478,
];
