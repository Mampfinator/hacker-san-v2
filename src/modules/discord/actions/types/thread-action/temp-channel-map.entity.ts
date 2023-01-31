import { AfterLoad, BeforeInsert, Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Platform } from "../../../../../constants";

@Entity()
@Unique("PLATFORM_PLATFORMID", ["platform", "platformId"])
export class TempChannelMap {
    @PrimaryGeneratedColumn("increment")
    public readonly id: number;

    @Column()
    public readonly platform: Platform;
    @Column()
    public readonly platformId: string;
    @Column()
    private channelIds: string[];

    public channels: Set<string> = new Set();

    @BeforeInsert()
    private makeChannelIdArray() {
        this.channelIds = [...this.channels];
    }

    @AfterLoad()
    private makeChannelSet() {
        this.channels = new Set(this.channelIds);
    }
}