import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    GuildBasedChannel,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { FindOperator, IsNull, Repository } from "typeorm";
import { ActionDescriptor } from "../../models/action.entity";
import { ISlashCommand, SlashCommand } from "../slash-command";
import { Util } from "../../../../util";
import { MultipageMessage } from "../../../../shared/util/multipage-message";
import { DiscordUtil } from "../../util";
import { Autocomplete, AutocompleteReturn } from "../autocomplete";
import { GuildSettings } from "../../models/settings.entity";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { EnsureChannelCommand } from "../../../../modules/platforms/commands/ensure-channel.command";
import { InjectRepository } from "@nestjs/typeorm";
import { Event, Platform } from "../../../../constants";

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Admin command to manage this guild's settings.")
        .setDMPermission(false)
        .setDefaultMemberPermissions(0)
        .addSubcommand(actions =>
            actions
                .setName("actions")
                .setDescription("View configured actions for this guild.")
                .addStringOption(platform =>
                    DiscordUtil.makePlatformOption(platform, "The platform for which to retrieve actions."),
                )
                .addStringOption(type => DiscordUtil.makeActionTypeOption(type, "The type of action to retrieve."))
                .addStringOption(event => DiscordUtil.makeEventOption(event, "The event to retrieve actions for."))
                .addStringOption(channel =>
                    channel
                        .setName("channel")
                        .setDescription(
                            "The platform channel to retrieve actions for. Requires platform to be specified.",
                        )
                        .setAutocomplete(true),
                )
                .addChannelOption(forChannel =>
                    forChannel
                        .setName("for-channel")
                        .setDescription("The Discord channel for which to retrieve actions."),
                ),
        )
        .addSubcommandGroup(channels =>
            channels
                .setName("channels")
                .setDescription("Manage this guild's primary channels.")
                .addSubcommand(add =>
                    add
                        .setName("add")
                        .setDescription("Add a primary channel. These are used for /overview.")
                        .addStringOption(platform =>
                            DiscordUtil.makePlatformOption(platform, "The channel's platform.").setRequired(true),
                        )
                        .addStringOption(channel =>
                            channel
                                .setName("channel")
                                .setDescription("The channel's ID or, for Twitter, @handle.")
                                .setRequired(true)
                                .setAutocomplete(true),
                        ),
                )
                .addSubcommand(remove =>
                    remove
                        .setName("remove")
                        .setDescription("Remove a primary channel.")
                        .addStringOption(platform =>
                            DiscordUtil.makePlatformOption(platform, "The channel's platform.").setRequired(true),
                        )
                        .addStringOption(channel =>
                            channel
                                .setName("channel")
                                .setDescription("The channel's ID or, for Twitter, @handle.")
                                .setRequired(true)
                                .setAutocomplete(true),
                        ),
                ),
        ),
})
export class SettingsCommand implements ISlashCommand {
    constructor(
        @InjectRepository(ActionDescriptor)
        private readonly actionRepo: Repository<ActionDescriptor>,
        @InjectRepository(GuildSettings)
        private readonly settingsRepo: Repository<GuildSettings>,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            interaction.reply("This command can only be used in a server.");
            return;
        }

        if (!interaction.memberPermissions.has("ManageGuild", true))
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor("Red").setDescription("You lack the permissions to do this!")],
                ephemeral: true,
            });

        const { options } = interaction;
        const subcommand = options.getSubcommandGroup(false) ?? options.getSubcommand();

        switch (subcommand) {
            case "view":
                await this.viewSettings(interaction);
                break;
            case "edit":
                await this.editSettings(interaction);
                break;
            case "actions":
                await this.viewActions(interaction);
                break;
            case "channels":
                await this.handlePrimaryChannel(interaction);
                break;
        }
    }

    async viewSettings(interaction: ChatInputCommandInteraction) {}

    async editSettings(interaction: ChatInputCommandInteraction) {}

    async viewActions(interaction: ChatInputCommandInteraction) {
        const { options, guildId, guild } = interaction;
        const channelId = options.getString("channel", false),
            discordChannel = options.getChannel("for-channel", false) as GuildBasedChannel,
            platform = options.getString("platform", false) as Platform,
            type = options.getString("type", false),
            event = options.getString("event", false) as Event;

        let channels = {};
        if (discordChannel) {
            let { discordThreadId, discordChannelId } = DiscordUtil.getChannelIds(discordChannel) as {
                discordThreadId: string | null | FindOperator<any>;
                discordChannelId: string;
            };
            discordThreadId = discordThreadId ?? IsNull();

            channels = { discordThreadId, discordChannelId };
        }

        const actions = await this.actionRepo.find({
            where: {
                guildId,
                channelId,
                platform,
                type,
                onEvent: event,
                ...channels,
            },
        });

        if (!actions || actions.length == 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor("Blue").setDescription("No actions found!")],
            });
        }

        let description = "";
        if (channelId) description += `\n Channel: ${channelId} (${platform})`;
        if (discordChannel) description += `\n In: ${discordChannel}`;

        if (description.length > 0) description = "**Filters**: " + description;

        const pagefields = Util.batch(actions.map((action, i) => action.toEmbedField(i % 2 == 0)));

        const message = new MultipageMessage({ interaction });

        let i = 0;
        for (const fields of pagefields) {
            i++;

            message.addPage({
                embeds: [
                    new EmbedBuilder({ description })
                        .setTitle(`Actions for ${guild.name} (${i}/${pagefields.length})`)
                        .setThumbnail(guild.iconURL())
                        .setDescription(description)
                        .setColor("Blue")
                        .addFields(fields),
                ],
            });
        }

        await message.send();
    }

    async handlePrimaryChannel(interaction: ChatInputCommandInteraction) {
        const settings = await this.settingsRepo.findOne({
            where: { id: interaction.guildId },
        });

        const id = interaction.options.getString("channel-id"),
            platform = interaction.options.getString("platform") as Platform;

        const mode = interaction.options.getSubcommand() as "add" | "remove";

        if (mode == "add") {
            const alreadyExists = settings.addPrimaryChannel(id, platform);
            if (!alreadyExists)
                return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Blue")
                            .setDescription("Channel is already one of this server's primary channels!"),
                    ],
                    ephemeral: true,
                });

            const { success } = await this.commandBus.execute(new EnsureChannelCommand(id, platform));
            if (!success)
                return await interaction.reply({
                    embeds: [new EmbedBuilder().setColor("Blue").setDescription("Invalid ID.")],
                    ephemeral: true,
                });

            await this.settingsRepo.save(settings);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(`Successfully added ${id} (${platform}) to this server's primary channels.`),
                ],
            });
        } else if (mode == "remove") {
            const removed = settings.removePrimaryChannel(id, platform);
            if (!removed)
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setDescription("Channel is not a primary channel of this server."),
                    ],
                    ephemeral: true,
                });

            interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(
                            `Successfully removed ${id} (${platform} from this server's primary channels.)`,
                        ),
                ],
            });
        }
    }

    @Autocomplete("channel")
    private async getChannel(interaction: AutocompleteInteraction): Promise<AutocompleteReturn> {
        return DiscordUtil.handleChannelAutocomplete(interaction, this.queryBus);
    }
}
