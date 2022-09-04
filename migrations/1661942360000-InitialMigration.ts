import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1661942360000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."action_type_enum" AS ENUM()`);
        await queryRunner.query(`CREATE TYPE "public"."action_platform_enum" AS ENUM('youtube', 'twitter')`);
        await queryRunner.query(`CREATE TYPE "public"."action_onevent_enum" AS ENUM('live', 'upload', 'offline', 'upcoming', 'post')`);
        await queryRunner.query(`CREATE TABLE "action" ("id" character varying NOT NULL, "guildId" character varying NOT NULL, "type" "public"."action_type_enum" NOT NULL, "discordChannelId" character varying NOT NULL, "discordThreadId" character varying, "channelId" character varying NOT NULL, "platform" "public"."action_platform_enum" NOT NULL, "onEvent" "public"."action_onevent_enum" NOT NULL, "data" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_2d9db9cf5edfbbae74eb56e3a39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "guild_settings" ("id" character varying NOT NULL, "primaryChannels" jsonb NOT NULL DEFAULT '{"youtube":[],"twitter":[]}', CONSTRAINT "PK_259bd839beb2830fe5c2ddd2ff5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."channel_platform_enum" AS ENUM('youtube', 'twitter')`);
        await queryRunner.query(`CREATE TABLE "channel" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "platform" "public"."channel_platform_enum" NOT NULL, "platformId" character varying NOT NULL, "name" character varying NOT NULL, "userName" character varying, "avatarUrl" character varying, "isPrimaryChannel" boolean NOT NULL, CONSTRAINT "PK_590f33ee6ee7d76437acf362e39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."twitter_space_status_enum" AS ENUM('live', 'offline', 'scheduled')`);
        await queryRunner.query(`CREATE TABLE "twitter_space" ("id" character varying NOT NULL, "status" "public"."twitter_space_status_enum" NOT NULL, "channelId" character varying NOT NULL, "title" character varying NOT NULL, "scheduledStart" integer, CONSTRAINT "PK_9f2c7b08f887f63fc48449b38c9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "twitter_user" ("id" character varying NOT NULL, "name" character varying, CONSTRAINT "PK_e988122f5fcd4e4ec0ba4a67784" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "community_post" ("id" character varying NOT NULL, CONSTRAINT "PK_7b57231e04516d8689309424058" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "you_tube_channel" ("channelId" character varying NOT NULL, "channelName" character varying, "avatarUrl" character varying, CONSTRAINT "PK_54a53a02061274c172356478240" PRIMARY KEY ("channelId"))`);
        await queryRunner.query(`CREATE TYPE "public"."you_tube_video_status_enum" AS ENUM('live', 'upcoming', 'offline')`);
        await queryRunner.query(`CREATE TABLE "you_tube_video" ("id" character varying NOT NULL, "status" "public"."you_tube_video_status_enum" NOT NULL, "channelId" character varying NOT NULL, CONSTRAINT "PK_e3001cf89dc14e4dbf1bd2efba7" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "you_tube_video"`);
        await queryRunner.query(`DROP TYPE "public"."you_tube_video_status_enum"`);
        await queryRunner.query(`DROP TABLE "you_tube_channel"`);
        await queryRunner.query(`DROP TABLE "community_post"`);
        await queryRunner.query(`DROP TABLE "twitter_user"`);
        await queryRunner.query(`DROP TABLE "twitter_space"`);
        await queryRunner.query(`DROP TYPE "public"."twitter_space_status_enum"`);
        await queryRunner.query(`DROP TABLE "channel"`);
        await queryRunner.query(`DROP TYPE "public"."channel_platform_enum"`);
        await queryRunner.query(`DROP TABLE "guild_settings"`);
        await queryRunner.query(`DROP TABLE "action"`);
        await queryRunner.query(`DROP TYPE "public"."action_onevent_enum"`);
        await queryRunner.query(`DROP TYPE "public"."action_platform_enum"`);
        await queryRunner.query(`DROP TYPE "public"."action_type_enum"`);
    }

}
