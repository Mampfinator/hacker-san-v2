import { Column, Entity, PrimaryColumn } from "typeorm";

export type TwitterSpaceStatus = "live" | "offline" | "scheduled";

@Entity()
export class TwitterSpace {
    @PrimaryColumn()
    id: string;

    @Column({
        type: "enum",
        enum: ["live", "offline", "scheduled"]
    })
    status: TwitterSpaceStatus

    @Column()
    channelId: string;

    // @Column()
    // archived: boolean;
}