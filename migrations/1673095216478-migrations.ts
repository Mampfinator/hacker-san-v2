import { MigrationInterface, QueryRunner } from "typeorm";

export class migrations1673095216478 implements MigrationInterface {
    name = 'migrations1673095216478'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "post" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "platformId" character varying NOT NULL, "platform" character varying NOT NULL, "content" jsonb, "images" text array, "poll" text array, "data" jsonb, CONSTRAINT "PK_f3f8fa40f4a72d88f3dd0f060cc" PRIMARY KEY ("id", "platformId"))`);
        await queryRunner.query(`CREATE TYPE "public"."stream_status_enum" AS ENUM('live', 'offline', 'upcoming')`);
        await queryRunner.query(`CREATE TABLE "stream" ("id" SERIAL NOT NULL, "platform" character varying NOT NULL, "platformId" character varying NOT NULL, "channelId" character varying NOT NULL, "title" character varying NOT NULL, "status" "public"."stream_status_enum" NOT NULL, CONSTRAINT "PLATFORM_ID_UNIQUE" UNIQUE ("platformId", "platform"), CONSTRAINT "PK_0dc9d7e04ff213c08a096f835f2" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "stream"`);
        await queryRunner.query(`DROP TYPE "public"."stream_status_enum"`);
        await queryRunner.query(`DROP TABLE "post"`);
    }

}
