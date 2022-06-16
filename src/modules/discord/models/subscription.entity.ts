import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Subscription {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    guildId: string;

    @Column()
    discordChannelId: string;

    @Column({nullable: true})
    discordThreadId?: string;

    @Column()
    channelId: string;

    @Column()
    platform: string;
}