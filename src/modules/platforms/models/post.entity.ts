import { Column, PrimaryColumn } from "typeorm";
import { Platform } from "../../../constants";

/**
 * Represents a platform-independent
 */
export class PostEntity {
    @PrimaryColumn()
    id: string;

    @Column()
    platform: Platform;
}
