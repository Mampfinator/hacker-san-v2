import { Platform, SUPPORTED_PLATFORMS } from "../../../constants";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Represents a paltform-independent creator channel.
 */
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

    /**
     * A channel's display name.
     */
    @Column()
    name: string;

    /**
     * An ID-lite username, like Twitter handles, YouTube @tags, ...
     */
    @Column({ nullable: true })
    userName?: string;

    @Column({ nullable: true })
    avatarUrl?: string;
}
