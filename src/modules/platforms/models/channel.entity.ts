import { Platform, SUPPORTED_PLATFORMS } from "../../../constants";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "channel" })
export class ChannelEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "enum", enum: SUPPORTED_PLATFORMS })
    platform: Platform;

    /**
     * ID of the channel on the platform, e.g. YouTube channel ID.
     */
    @Column()
    platformId: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    userName?: string;

    @Column({ nullable: true })
    avatarUrl?: string;

    /**
     * Indicates whether to fetch posts, listen to events, etc
     */
    @Column()
    isPrimaryChannel: boolean;
}
