import { SlashCommandBuilder } from "@discordjs/builders";
import { InjectRepository } from "@nestjs/typeorm";
import { CommandInteraction, GuildBasedChannel, MessageEmbed } from "discord.js";
import { FindOperator, IsNull, Repository } from "typeorm";
import { Action, Platform } from "../../models/action.entity";
import { ISlashCommand, SlashCommand } from "./slash-command";
import { Util } from "src/util";
import { execPath } from "process";
import { MultipageMessage } from "src/shared/util/multipage-message";
import { DiscordUtil } from "../../util";

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Admin command to manage this guild's settings.")
        .addSubcommand(actions =>
            actions
                .setName("actions")
                .setDescription("View configured actions for this guild.")
                .addChannelOption(forChannel =>
                    forChannel
                        .setName("for-channel")
                        .setDescription(
                            "The Discord channel for which to retrieve actions.",
                        ),
                )
                .addStringOption(platform =>
                    platform
                        .setName("platform")
                        .setDescription(
                            "The platform for which to retrieve actions.",
                        )
                        .setChoices(
                            { name: "YouTube", value: "youtube" },
                            { name: "Twitter", value: "twitter" },
                        ),
                )
                .addStringOption(channel =>
                    channel
                        .setName("channel")
                        .setDescription(
                            "The platform channel to retrieve actions for. Requires platform to be specified.",
                        ),
                ),
        ),
})
export class SettingsCommand implements ISlashCommand {
    constructor(
        @InjectRepository(Action)
        private readonly actionRepo: Repository<Action>,
    ) {}

    async execute(interaction: CommandInteraction) {
        if (!interaction.memberPermissions.has("MANAGE_GUILD", true))
            return interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor("RED")
                        .setDescription("You lack the permissions to do this!"),
                ],
                ephemeral: true,
            });

        const { options } = interaction;
        const subcommand =
            options.getSubcommandGroup(false) ?? options.getSubcommand();

        switch (subcommand) {
            case "view":
                this.viewSettings(interaction);
                break;
            case "edit":
                this.editSettings(interaction);
                break;
            case "actions":
                this.viewActions(interaction);
                break;
        }
    }

    async viewSettings(interaction: CommandInteraction) {}

    async editSettings(interaction: CommandInteraction) {}

    async viewActions(interaction: CommandInteraction) {
        const { options, guildId } = interaction;
        const channelId = options.getString("channel", false),
            discordChannel = options.getChannel("for-channel", false) as GuildBasedChannel,
            platform = options.getString("platform", false) as Platform;

        let channels = {};
        if (discordChannel) {
            let {discordThreadId, discordChannelId} = DiscordUtil.getChannelIds(discordChannel) as {discordThreadId: string | null | FindOperator<any>, discordChannelId: string};
            discordThreadId = discordThreadId ?? IsNull();

            channels = {discordThreadId, discordChannelId};
        }

        const actions = await this.actionRepo.find({
            where: {
                guildId,
                channelId,
                platform,
                ...channels
            },
        });

        if (!actions || actions.length == 0) {
            return interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor("BLUE")
                        .setDescription("No actions found!"),
                ],
            });
        }

        const pagefields = Util.batch(
            actions.map(action => action.toEmbedField()),
        );

        const message = new MultipageMessage({ interaction });

        for (const fields of pagefields) {
            message.addPage({
                embeds: [
                    new MessageEmbed()
                        .setColor("BLUE")
                        .setDescription(`Viewing actions in guild ${guildId}`)
                        .addFields(fields),
                ],
            });
        }

        await message.send();
    }
}
