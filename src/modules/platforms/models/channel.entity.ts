import { Platform, SUPPORTED_PLATFORMS } from "../../../constants";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { IPlatformObject } from "../platform.interfaces";

/**
 * Represents a paltform-independent creator channel.
 */
@Entity({ name: "channel" })
export class ChannelEntity implements IPlatformObject {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "enum", enum: SUPPORTED_PLATFORMS })
    platform: Platform;

    @Column()
    platformId: string;

    /**
     * A channel's display name.
     */
    @Column()
    name: string;

    /**
     * An ID-lite username, like Twitter handles, YouTube @tags, ...
     * May not be present for all platforms!
     */
    @Column({ nullable: true })
    userName?: string;

    /**
     * URL to the channel's avatar. May be blank initially, but should be cached in most cases.
     */
    @Column({ nullable: true })
    avatarUrl?: string;
}
