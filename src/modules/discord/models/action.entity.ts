import { EmbedField } from "discord.js";
import {
    BeforeInsert,
    Column,
    Entity,
    PrimaryColumn,
    PrimaryGeneratedColumn,
    Unique,
} from "typeorm";
import { getActions } from "../actions/action";
export type Platform = "youtube" | "twitter";
export type Event = "live" | "upload" | "offline" | "upcoming";

const actionEnum: string[] = getActions().map(action => action.prototype.type);
const firstUpperCase = (value: string): string => {
    const [first, ...rest] = Array.from(value);
    return `${first.toUpperCase()}${rest.join("")}`;
};

const descriptify = (input: Record<string, string>, joiner = "\n"): string => {
    let output = "";

    for (const [key, value] of Object.entries(input)) {
        output += `**${firstUpperCase(key)}**: ${value ?? "`None`"}${joiner}`;
    }

    return output;
};

// This is stupid. But it's the only workaround I could find.
// We can assume nanoid to be imported before an Action is created.
let nanoid: () => string;
Function('return import("nanoid")')().then(({ customAlphabet }) => {
    nanoid = customAlphabet(
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-",
        9,
    );
});

@Entity()
@Unique("IDENTICAL_ACTIONS", [
    "guildId",
    "discordChannelId",
    "discordThreadId",
    "channelId",
    "platform",
    "onEvent",
])
export class Action {
    public toEmbedField(inline?: boolean): EmbedField {
        return {
            name: `${this.id} - ${firstUpperCase(this.type)}`,
            value: `${this.platform} (${this.channelId})\n**Channel**: <#${
                this.discordThreadId ?? this.discordChannelId
            }> \n ${this.data ? descriptify(this.data) : ""}`,
            inline: inline ?? false,
        };
    }

    @PrimaryColumn("varchar", { default: () => `'${nanoid()}'` }) // shorter IDs than UUIDs for better readability, since Action IDs are exposed publicly.
    id: string;

    @Column()
    guildId: string;

    @Column({
        type: "enum",
        enum: actionEnum,
    })
    type: string;

    @Column()
    discordChannelId: string;

    @Column({ nullable: true })
    discordThreadId?: string;

    @Column()
    channelId: string;

    @Column({ type: "enum", enum: ["youtube", "twitter"] })
    platform: Platform;

    @Column({
        type: "enum",
        enum: ["live", "upload", "offline", "upcoming", "post"],
    })
    onEvent: string;

    /**
     * Contains additional things like custom text, a channel, ...
     */
    @Column("jsonb", { nullable: false, default: {} })
    data: any;
}
