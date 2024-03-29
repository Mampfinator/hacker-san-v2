import { EmbedBuilder } from "@discordjs/builders";
import { Colors } from "discord.js";

/**
 * If this is thrown within a slash command handler, the dispatcher automatically replies with an autogenerated embed.
 */
export class SlashCommandError {
    private reason: string;
    private name: string;

    public setReason(reason: string): this {
        this.reason = reason;
        return this;
    }

    public setName(name: string): this {
        this.name = name;
        return this;
    }

    public toEmbed(): EmbedBuilder {
        if (!this.reason || !this.name)
            throw new TypeError(
                `Expected reason and name to be set, got ${typeof this.reason} and ${typeof this.name} respectively.`,
            );
        return new EmbedBuilder().setColor(Colors.Red).setDescription(this.reason).setTitle(this.name);
    }
}
