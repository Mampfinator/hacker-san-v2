import { EmbedBuilder } from "@discordjs/builders";
import { Colors } from "discord.js";
import { Command } from "../decorators/command.decorator";
import { String } from "../decorators/option.decorator";
import { SlashCommand } from "../decorators/slash-command.decorator";

@SlashCommand({ description: "Stuck? Curious? Use me!", name: "help" })
export class HelpCommand {
    @Command()
    handle(
        @String({ name: "topic", description: "What exactly you need help on. Omit for an overview.", required: false })
        topic?: string,
    ) {
        return {
            embeds: [
                new EmbedBuilder().setColor(Colors.Green).setDescription(`You searched for: ${topic ?? "Nothing!"}`),
            ],
        };
    }
}
