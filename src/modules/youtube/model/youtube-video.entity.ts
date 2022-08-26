import { Column, Entity, PrimaryColumn } from "typeorm";

export enum YouTubeLiveStatus {
    Live = "live",
    Upcoming = "upcoming",
    Offline = "offline",
}

@Entity()
export class YouTubeVideo {
    @PrimaryColumn()
    id: string;

    @Column({
        type: "enum",
        enum: YouTubeLiveStatus,
    })
    status: YouTubeLiveStatus;

    @Column()
    channelId: string;
}
