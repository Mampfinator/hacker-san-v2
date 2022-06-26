import {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import { Logger } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import {
    AutocompleteInteraction,
    CommandInteraction,
    MessageEmbed,
    TextChannel,
    ThreadChannel,
} from "discord.js";
import { EnsureChannelCommand } from "src/modules/platforms/commands/ensure-channel.command";
import { Repository } from "typeorm";
import { Action } from "../../models/action.entity";
import { PALTFORM_NAME_LOOKUP, Platform } from "src/constants";
import { DiscordUtil } from "../../util";
import { Autocomplete, AutocompleteReturn } from "./autocomplete";
import { ISlashCommand, SlashCommand } from "./slash-command";
import { Util } from "src/util";

function addShared(
    builder: SlashCommandSubcommandBuilder,
    before: (
        builder: SlashCommandSubcommandBuilder,
    ) => SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return before(builder)
        .addStringOption(platform => DiscordUtil.makePlatformOption(platform).setRequired(true)
            /*platform
                .setName("platform")
                .setDescription("The platform to listen for.")
                .setChoices(
                    { name: "YouTube", value: "youtube" },
                    { name: "Twitter", value: "twitter" },
                )
                .setRequired(true),*/
        )
        .addStringOption(event =>
            event
                .setName("event")
                .setDescription("Which particular event to listen for.")
                .setChoices(
                    { name: "Upload", value: "upload" },
                    { name: "Live", value: "live" },
                    { name: "Upcoming", value: "upcoming" },
                    { name: "Offline", value: "offline" },
                    { name: "Post", value: "post" },
                )
                .setRequired(true),
        )
        .addStringOption(channel =>
            channel
                .setName("channel")
                .setDescription("The channel. For YouTube, actual ID required.")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addChannelOption(channel =>
            channel
                .setName("for-channel")
                .setDescription(
                    "The channel to execute in. Defaults to this channel.",
                )
                .setRequired(false),
        );
}

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("action")
        .setDescription("Manage actions")
        .setDMPermission(false)
        .setDefaultMemberPermissions(0)
        .addSubcommand(remove =>
            remove
                .setName("remove")
                .setDescription("Remove an action.")
                .addStringOption(id =>
                    id
                        .setName("action")
                        .setDescription("The ID of the action to remove.")
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand(lock =>
            addShared(lock, lock =>
                lock
                    .setName("lock")
                    .setDescription(
                        "Lock or unlock this channel when the corresponding event is fired.",
                    )
                    .addStringOption(mode =>
                        mode
                            .setName("mode")
                            .setDescription(
                                "Whether to lock or unlock the channel",
                            )
                            .setChoices(
                                { name: "lock", value: "lock" },
                                { name: "unlock", value: "unlock" },
                            )
                            .setRequired(true),
                    ),
            ).addStringOption(message =>
                message
                    .setName("message")
                    .setDescription(
                        "Message to send after unlocking/before locking.",
                    )
                    .setRequired(false),
            ),
        )
        .addSubcommand(rename =>
            addShared(rename, rename =>
                rename
                    .setName("rename")
                    .setDescription(
                        "Rename this channel when the corresponding event is fired.",
                    )
                    .addStringOption(name =>
                        name
                            .setName("name")
                            .setDescription("The channel's new name")
                            .setRequired(true),
                    ),
            ),
        )
        .addSubcommand(echo =>
            addShared(echo, echo =>
                echo
                    .setName("echo")
                    .setDescription(
                        "Send a message in this channel when the corresponding event is fired.",
                    )
                    .addStringOption(message =>
                        message
                            .setName("message")
                            .setDescription(
                                "The message to send. Supports certain variables. See /help event-vars for more.",
                            )
                            .setRequired(true),
                    ),
            ),
        )
        .addSubcommand(notify =>
            addShared(notify, notify =>
                notify
                    .setName("notify")
                    .setDescription(
                        "Send a notification in this channel when the corresponding event is fired.",
                    )
                    .addStringOption(message =>
                        message
                            .setName("message")
                            .setDescription(
                                "A message to send on notification.",
                            )
                            .setRequired(true),
                    ),
            ),
        ),
})
export class ActionCommand implements ISlashCommand {
    private readonly logger = new Logger(ActionCommand.name);

    private readonly actionMethods: {
        [key: string]: (interaction: CommandInteraction) => any | Promise<any>;
    } = {};

    constructor(
        @InjectRepository(Action)
        private readonly actionRepo: Repository<Action>,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {
        this.actionMethods.lock = (interaction: CommandInteraction) =>
            this.handleLock(interaction);
        this.actionMethods.rename = (interaction: CommandInteraction) =>
            this.handleRename(interaction);
        this.actionMethods.echo = (interaction: CommandInteraction) =>
            this.handleEcho(interaction);
        this.actionMethods.notify = (interaction: CommandInteraction) =>
            this.handleNotify(interaction);
        this.actionMethods.remove = (interaction: CommandInteraction) =>
            this.handleRemove(interaction);
    }

    async execute(interaction: CommandInteraction) {
        if (!interaction.memberPermissions.any(["MANAGE_GUILD"], true))
            return interaction.reply({
                content: "You don't have the necessary permissions to do that.",
                ephemeral: true,
            });

        const subcommand = interaction.options.getSubcommand() as
            | "remove"
            | "lock"
            | "rename"
            | "echo"
            | "notify";

        const dataOption: { data: any } | void = await this.actionMethods[
            subcommand
        ](interaction);
        if (dataOption) {
            const options = await this.getBasicOptions(interaction);
            if (!options) return; // getBasicOptions handles the reply in this case.
            try {
                const action = await this.actionRepo.save(
                    this.actionRepo.create({
                        ...options,
                        ...dataOption,
                    }),
                );
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setDescription(
                                `Added new callback with ID ${action.id}`,
                            )
                            .setColor("GREEN"),
                    ],
                    ephemeral: true,
                });
            } catch (error) {
                this.logger.error(error);
            }
        }
    }

    async getBasicOptions(
        interaction: CommandInteraction,
    ): Promise<Partial<Action> | undefined> {
        const { options, channel: interactionChannel, guildId } = interaction;

        const channelOption = options.getChannel("for-channel", false);
        const channel = (channelOption ?? interactionChannel) as TextChannel;

        const discordChannelId = channel.isThread()
            ? (channel as ThreadChannel).parentId
            : channel.id;
        const discordThreadId = channel.isThread()
            ? (channel as ThreadChannel).id
            : undefined;

        let channelId = options.getString("channel");
        const platform = options.getString("platform") as Platform;

        const {
            success,
            error,
            channelId: newChannelId,
        } = await this.commandBus.execute(
            new EnsureChannelCommand(channelId, platform),
        );

        channelId = newChannelId ?? channelId; // make things like passing Twitter users by @handle possible.

        if (!success) {
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor("RED")
                        .setDescription("Error: invalid channel ID"),
                ],
                ephemeral: true,
            });

            this.logger.debug(
                `Failed to insert channel ID: ${error ?? "Invalid ID."}`,
            );
            return;
        }

        return {
            type: options.getSubcommand(),
            guildId,
            discordChannelId,
            discordThreadId,
            onEvent: options.getString("event"),
            platform,
            channelId,
        };
    }

    handleLock({ options }: CommandInteraction): { data: any } {
        return {
            data: {
                mode: options.getString("mode"),
                message: options.getString("message", false),
            },
        };
    }

    handleRename({ options }: CommandInteraction): { data: any } {
        return {
            data: {
                name: options.getString("name"),
            },
        };
    }

    handleEcho({ options }: CommandInteraction): { data: any } {
        return {
            data: {
                message: options.getString("message"),
            },
        };
    }

    handleNotify({ options }: CommandInteraction): { data: any } {
        return {
            data: {
                message: options.getString("message"),
            },
        };
    }

    async handleRemove(interaction: CommandInteraction) {
        const id = interaction.options.getString("action", true).trim();
        const action = await this.actionRepo.findOne({
            where: { id, guildId: interaction.guildId },
        });
        if (!action)
            return interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle("Could not remove Action")
                        .setDescription(`Could not find action with ID ${id}.`)
                        .setColor("RED"),
                ],
            });

        const result = await this.actionRepo.remove(action);

        interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle("Removed Action")
                    .setDescription(`Removed action with ID ${result.id}.`)
                    .addFields(result.toEmbedField()),
            ],
        });
    }

    @Autocomplete("action")
    private async getActionsWithMatchingIds(
        interaction: AutocompleteInteraction,
    ): Promise<AutocompleteReturn> {
        const value = interaction.options.getFocused() as string;

        const actions = await this.actionRepo.find({
            where: { guildId: interaction.guildId },
        });

        const actionToLabel = (action: Action) =>
            `${action.id} - ${Util.firstUpperCase(action.type)} (${action.channelId}, ${PALTFORM_NAME_LOOKUP[action.platform]})`;

        return actions
            .filter(action => {
                return (
                    action.id.toLowerCase().includes(value.toLowerCase()) ||
                    value.includes(action.type) ||
                    action.channelId
                        .toLowerCase()
                        .includes(value.toLowerCase()) ||
                    action.platform.toLowerCase().includes(value.toLowerCase())
                );
            })
            .map(action => ({ name: actionToLabel(action), value: action.id }))
            .slice(0, 25);
    }

    @Autocomplete("channel")
    private async getChannel(
        interaction: AutocompleteInteraction,
    ): Promise<AutocompleteReturn> {
        return DiscordUtil.handleChannelAutocomplete(
            interaction,
            this.queryBus,
        );
    }
}
