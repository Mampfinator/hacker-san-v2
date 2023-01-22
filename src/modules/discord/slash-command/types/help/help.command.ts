import { EmbedBuilder } from "@discordjs/builders";
import { Colors } from "discord.js";
import { Command } from "../../decorators/command.decorator";
import { String } from "../../decorators/option.decorator";
import { SlashCommand } from "../../decorators/slash-command.decorator";
import { HELP_COMMAND_TOPIC_MAP } from "./help.command.constants";

@SlashCommand({ description: "Stuck? Curious? Use me!", name: "help" })
export class HelpCommand {
    @Command()
    handle(
        @String({
            name: "topic",
            description: "What exactly you need help on. Omit for an overview.",
            required: false,
            choices: [{ name: "Platforms", value: "platforms" }],
        })
        topic?: "actions" | "interpolation" | "platforms",
    ) {
        return {
            embeds: [HELP_COMMAND_TOPIC_MAP.get(topic)],
            ephemeral: true,
        };
    }
}
