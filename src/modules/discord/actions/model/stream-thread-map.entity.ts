import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Platform } from "../../../../constants";
/**
 * Maps temporary Discord channels to a unique stream identifier.
 */
@Entity()
export class StreamDiscordChannelMap {
    @PrimaryGeneratedColumn("uuid")
    public readonly id: string;

    @Column()
    platform: Platform;
<<<<<<< HEAD
=======

>>>>>>> 8179ca5 (Some major fixes)
    @Column()
    platformId: string;

    @Column()
    channelId: string;
}
