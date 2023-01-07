import { Platform } from "../../../constants";
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import { IPlatformObject } from "../platform.interfaces";

export enum StreamStatus {
    Live = "live",
    Offline = "offline",
    Upcoming = "upcoming",
}

/**
 * Represents a watchable resource (a stream, video upload, a Space, ...)
 */
@Unique("PLATFORM_ID_UNIQUE", ["platformId", "platform"])
@Entity({ name: "stream" })
export class StreamEntity implements IPlatformObject {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    platform: Platform;

    /**
     *  ID of the stream on the platform, e.g. YouTube video ID.
     */
    @Column()
    platformId: string;

    @Column()
    channelId: string;

    @Column()
    title: string;

    @Column({ type: "enum", enum: StreamStatus })
    status: StreamStatus;
}
