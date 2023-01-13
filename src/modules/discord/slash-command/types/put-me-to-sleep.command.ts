import { ChatInputCommandInteraction, Colors, Embed, EmbedBuilder, GuildMember } from "discord.js";
import { HammertimeFlag, toHammertime } from "../../util";
import { Command } from "../decorators/command.decorator";
import { Interaction } from "../decorators/interaction.decorator";
import { Integer, Member } from "../decorators/option.decorator";
import { SlashCommand } from "../decorators/slash-command.decorator";

@SlashCommand({name: "put-me-to-sleep", description: "Put a user to sleep!"})
export class PutMeToSleepCommand {
    @Command()
    async putToSleep(
        @Member({name: "member", description: "The member to time out.", required: true}) member: GuildMember,
        @Interaction() interaction: ChatInputCommandInteraction,
        @Integer({name: "time", description: "Amount of time (in hours) to put the user to sleep for.", min_value: 1, max_value: 8}) time?: number,
    ) {
        const {member: issuer} = interaction;

        await interaction.deferReply();

        const until = new Date(Date.now() + (time ?? 8 * 60 * 60 * 1000));

        await member.disableCommunicationUntil(until, `Put to sleep by ${issuer.user.username} (${issuer.user.id})`);

        return new EmbedBuilder()
            .setColor(Colors.Green)
            .setDescription(`Put ${member} to sleep until ${toHammertime(until, HammertimeFlag.FullTime)} (${toHammertime(until, HammertimeFlag.Remaining)})`);
    }
}