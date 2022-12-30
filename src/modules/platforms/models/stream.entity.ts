import { Platform } from "../../../constants";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum StreamStatus {
    Live = "live",
    Offline = "offline",
    Upcoming = "upcoming",
}

/**
 * Represents a watchable resource (a stream, video upload, a Space, ...)
 */
@Entity({ name: "stream" })
export class StreamEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    platform: Platform;

    // ID of the stream on the platform, e.g. YouTube video ID.
    @Column({ nullable: true })
    platformId?: string;

    @Column()
    title: string;

    @Column({ type: "enum", enum: StreamStatus })
    status: StreamStatus;
}
