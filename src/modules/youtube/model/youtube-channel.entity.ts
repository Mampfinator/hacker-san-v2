import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class YouTubeChannel {
    @PrimaryColumn()
    channelId: string;

    @Column({ nullable: true })
    channelName?: string;

    @Column({ nullable: true })
    avatarUrl?: string;
}
