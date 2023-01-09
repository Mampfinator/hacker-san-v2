import { MigrationInterface, QueryRunner } from "typeorm";

export class StreamDiscordChannelMigration1673167214340 implements MigrationInterface {
    name = "StreamDiscordChannelMigration1673167214340";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stream_discord_channel_map" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "platform" character varying NOT NULL, "platformId" character varying NOT NULL, "channelId" character varying NOT NULL, CONSTRAINT "PK_13d60ef9e10c88e60cddbaf0137" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "action" DROP COLUMN "type"`);
    }

}
