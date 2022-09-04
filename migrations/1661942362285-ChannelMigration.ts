import { Logger } from "@nestjs/common";
import { MigrationInterface, QueryRunner } from "typeorm"

export class ChannelMigration1661942362285 implements MigrationInterface {
    private readonly logger = new Logger("ChannelMigration");


    public async up(queryRunner: QueryRunner): Promise<void> {
        // migrate all YouTube channels
        const [{count: rows}] = await queryRunner.query(
            `SELECT count(*) from you_tube_channel`
        );

        this.logger.debug(`Found ${typeof rows == "object" ? JSON.stringify(rows) : rows} rows in you_tube_channel.`);

        if (rows > 0) {
            await queryRunner.query(`
                INSERT INTO channel(platform, "platformId", "name", "userName", "avatarUrl", "isPrimaryChannel")
                VALUES('youtube', (SELECT "channelId" FROM you_tube_channel), (SELECT "channelName" FROM you_tube_channel), NULL, (SELECT "avatarUrl" FROM you_tube_channel), TRUE);
                DROP TABLE you_tube_channel;
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // TODO: finish down migration; it's just two queries, one where platform = 'youtube' and one where platform = 'twitter'
    
    }
}
