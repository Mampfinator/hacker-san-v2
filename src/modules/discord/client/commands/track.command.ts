import { CommandInteraction, CacheType, MessageEmbed } from "discord.js";
import {SlashCommandBuilder} from "@discordjs/builders";
import { SlashCommand, ISlashCommand } from "../slash-command";
import { SUPPORTED_PLATFORMS } from "src/constants";
import { Repository } from "typeorm";
import { Subscription } from "../../models/subscription.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { CommandBus, QueryBus } from "@nestjs/cqrs";

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("track")
        .setDescription("Track a channel in this channel.")
        .addStringOption(platform => platform
            .setName("platform")
            .setDescription("Platform to track. For YouTube, includes comm. posts.")
            .addChoices(
                ...SUPPORTED_PLATFORMS.map(choice => 
                    ({name: choice, value: choice})
                )
            )
            .setRequired(true)
        )
        .addStringOption(channelId => channelId
            .setName("channel-id")
            .setDescription("Channel ID or handle.")
            .setRequired(true)
        )
})
export class TrackCommand implements ISlashCommand {
    public static instance: TrackCommand;
    constructor(
        @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus
    ) {
        TrackCommand.instance = this;
    }
    
    async execute(interaction: CommandInteraction<CacheType>) {
        const {options} = interaction;
        
        const platform = options.getString("platform"),
            channelId = options.getString("channel-id");

        const {channel, guildId} = interaction;
        let discordThreadId: string | undefined, discordChannelId: string;

        if (channel.isThread()) {
            discordThreadId = channel.id;
            discordChannelId = channel.parent.id;
        } else {
            discordChannelId = channel.id;
        }

        const subscription = await this.subscriptions.save({
            platform,
            channelId,
            discordChannelId,
            discordThreadId,
            guildId
        });

        if (!subscription) return interaction.reply({
            embeds: [
                new MessageEmbed().setColor("RED").setDescription("Something went wrong!")
            ]
        });

        interaction.reply({
            embeds: [
                new MessageEmbed().setColor("GREEN").setDescription(`Added new subscription ${subscription.id}`)
            ]
        })
    }
}