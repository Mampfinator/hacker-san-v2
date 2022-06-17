import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import { getActions } from "../actions/action";
export type Platform = "youtube" | "twitter";
export type Event = "live" | "upload" | "offline" | "upcoming"

const actionEnum: string[] = getActions().map(action => action.prototype.type);

@Entity()
@Unique("IDENTICAL_ACTIONS", ["guildId", "discordChannelId", "discordThreadId", "channelId", "platform", "onEvent"])
//@Check("'platform' <> 'youtube' AND 'onEvent' = 'post'")
export class Action {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    guildId: string;
    
    @Column({
        type: "enum",
        enum: actionEnum // for some reason this doesn't work. Probably something to do with the order in which decorators are evaluated?
    })
    type: string;

    @Column()
    discordChannelId: string;

    @Column({nullable: true})
    discordThreadId?: string;

    @Column()
    channelId: string;

    @Column({type: "enum", enum: ["youtube", "twitter"]})
    platform: Platform;

    @Column({type: "enum", enum: ["live", "upload", "offline", "upcoming", "post"]})
    onEvent: string;

    /**
     * Contains additional things like custom text, a channel, ...
     */
    @Column('jsonb', {nullable: false, default: {}})
    data: any;
}