import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Platform } from "../../../constants";
import { IPlatformObject } from "../platform.interfaces";

@Entity({name: "post"})
/**
 * Represents a platform-independent post, such as community posts or Tweets.
 */
export class PostEntity<T extends object = {}> implements IPlatformObject {
    @PrimaryGeneratedColumn("uuid")
    public readonly id?: string;

    @PrimaryColumn()
    platformId: string;

    @Column()
    platform: Platform;

    @Column({ nullable: true, type: "jsonb", array: false })
    content?: {
        /**
         * The displayed content of this substring
         */
        text: string;
        /**
         * If present, a link that the text points to.
         */
        url?: string;
    }[];

    /**
     * URLs to images that are directly part of this post.
     */
    @Column({})
    images?: string[];

    /**
     * Poll choices.
     */
    @Column({ nullable: true })
    poll?: string[];

    /**
     * Platform-specific data for internal use (such as embed generation.)
     */
    @Column({ type: "jsonb", nullable: true })
    data: T;
}

export type CommunityPostEntity = PostEntity<{
    /**
     * Stores images used in the poll, if present.
     */
    pollImages?: string[];
}>;
