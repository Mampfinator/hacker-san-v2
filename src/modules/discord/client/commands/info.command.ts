import { ConfigService } from "@nestjs/config";
import {
    ChatInputCommandInteraction,
    CacheType,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { TwitterConfig, YouTubeConfig } from "src/modules/config/config";
import { ISlashCommand, SlashCommand } from "./slash-command";

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Show info about the bot!")
        .setDMPermission(true),
})
export class InfoCommand implements ISlashCommand {
    constructor(private readonly config: ConfigService) {}

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const embed = new EmbedBuilder()
            .setColor("Aqua")
            .setDescription(
                `Author: <@159382108681404416> (Sir Eatsalot#6644)`,
            );

        const { active: youtubeActive } =
            this.config.get<YouTubeConfig>("YOUTUBE");
        const { active: twitterActive } =
            this.config.get<TwitterConfig>("TWITTER");
        embed.addFields({
            name: "Supported Platforms",
            value: `${youtubeActive ? " YouTube |" : ""} ${
                twitterActive ? " Twitter |" : ""
            }`,
        });

        await interaction.reply({
            embeds: [embed],
        });
    }
}
