import { EmbedField } from "discord.js";
import { Platform, PLATFORM_NAME_LOOKUP, Event } from "../../../constants";
import { Util } from "../../../shared/util/util";
import { BeforeInsert, Column, Entity, PrimaryColumn } from "typeorm";
import { getActions, getActionType } from "../actions/decorators/action";

const actionEnum: string[] = getActions().map(getActionType);

const descriptify = (input: Record<string, string>, joiner = "\n"): string => {
    let output = "";

    for (const [key, value] of Object.entries(input)) {
        output += `**${Util.firstUpperCase(key)}**: ${value ?? "`None`"}${joiner}`;
    }

    return output;
};

// This is stupid. But it's the only workaround I could find.
// We can assume nanoid to be imported before an Action is created.
let nanoid: () => string;
Function('return import("nanoid")')().then(({ customAlphabet }) => {
    nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-", 9);
});

@Entity({ name: "action" })
export class ActionDescriptor<T extends Record<string, string> = Record<string, string>> {
    public toEmbedField(inline?: boolean): EmbedField {
        return {
            name: `${this.id} | On: ${Util.firstUpperCase(this.onEvent)} - ${Util.firstUpperCase(this.type)}`,
            value: `${PLATFORM_NAME_LOOKUP[this.platform]} (${this.channelId})\n**Channel**: <#${
                this.discordThreadId ?? this.discordChannelId
            }> \n ${this.data ? descriptify(this.data) : ""}`,
            inline: inline ?? false,
        };
    }

    @PrimaryColumn("varchar") // shorter IDs than UUIDs for better readability, since Action IDs are exposed publicly.
    id: string;

    @BeforeInsert()
    private beforeInsert(): void {
        if (!this.id) {
            this.id = nanoid();
        }
    }

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
    onEvent: Event;

    /**
     * Contains additional things like custom text, a channel, ...
     */
    @Column("jsonb", { nullable: false, default: {} })
    data: T;
}
