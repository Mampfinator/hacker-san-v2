import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, CacheType } from "discord.js";
import { ISlashCommand, SlashCommand } from "./slash-command";

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Use me if you're lost!")
        .setDMPermission(true),
})
export class HelpCommand implements ISlashCommand {
    async execute(interaction: CommandInteraction<CacheType>) {
        interaction.reply({ content: "Coming soon:tm:.", ephemeral: true });
    }
}
