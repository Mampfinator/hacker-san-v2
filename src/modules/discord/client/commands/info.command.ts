import { SlashCommandBuilder } from "@discordjs/builders";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandInteraction, CacheType, MessageEmbed } from "discord.js";
import { TwitterConfig, YouTubeConfig } from "src/modules/config/config";
import { ISlashCommand, SlashCommand } from "./slash-command";

@Injectable()
@SlashCommand({
    commandData: new SlashCommandBuilder().setName("info").setDescription("Show info about the bot!")
})
export class InfoCommand implements ISlashCommand {

    constructor(
        private readonly config: ConfigService
    ) {}

    async execute(interaction: CommandInteraction<CacheType>) {
        const embed = new MessageEmbed()
            .setColor("AQUA")
            .setDescription(`Author: <@159382108681404416> (Sir Eatsalot#6644)`);
        
        const {active: youtubeActive} = this.config.get<YouTubeConfig>("YOUTUBE");
        const {active: twitterActive} = this.config.get<TwitterConfig>("TWITTER");
        embed.addField("Supported Platforms", `${youtubeActive ? " YouTube |" : ""} ${twitterActive ? " Twitter |" : ""}`);

        await interaction.reply({
            embeds: [
                embed
            ]
        })
    }
}