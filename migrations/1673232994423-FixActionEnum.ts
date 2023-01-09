import "../src/polyfill";

import { MigrationInterface, QueryRunner } from "typeorm";
import { getActions, getActionType } from "../src/modules/discord/actions/decorators/action";
import { Logger } from "@nestjs/common";

export class FixActionEnum1673232994423 implements MigrationInterface {
    name = 'FixActionEnum1673232994423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."action_type_enum" RENAME TO action_type_enum_old`);

        // previous migrations overwrote this with an empty enum, so we're completely replacing it to be safe
        const actionEnumString = `ENUM(${ getActions().map(getActionType).map(type => `'${type}'`).join(", ") })`;
        await queryRunner.query(`CREATE TYPE "public"."action_type_enum" as ${actionEnumString}`);
        await queryRunner.query(`ALTER TABLE "public"."action" ALTER COLUMN "type" TYPE action_type_enum USING "type"::text::action_type_enum`);

        await queryRunner.query(`DROP TYPE "public"."action_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
