import { MigrationInterface, QueryRunner } from "typeorm";

export class migrations1672455145161 implements MigrationInterface {
    name = 'migrations1672455145161'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "isPrimaryChannel"`);
        await queryRunner.query(`ALTER TABLE "action" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "action" ADD "type" "public"."action_type_enum" NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "action" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "action" ADD "type" action_type_enum NOT NULL`);
        await queryRunner.query(`ALTER TABLE "channel" ADD "isPrimaryChannel" boolean NOT NULL`);
    }

}
