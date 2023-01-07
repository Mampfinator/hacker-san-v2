import { MigrationInterface, QueryRunner } from "typeorm";

export class migrations1672455145161 implements MigrationInterface {
    name = 'migrations1672455145161'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "isPrimaryChannel"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "action" DROP COLUMN "type"`);
    }

}
