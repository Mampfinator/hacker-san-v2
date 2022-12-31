import { Logger } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
    ChatInputCommandInteraction,
    CacheType,
    AutocompleteInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    SelectMenuBuilder,
    Message,
    MessageComponentInteraction,
    SelectMenuInteraction,
    GuildBasedChannel,
    GuildTextBasedChannel,
    SelectMenuOptionBuilder,
    ButtonStyle,
    SlashCommandBuilder,
} from "discord.js";
import { EnsureChannelCommand } from "../../../../modules/platforms/commands/ensure-channel.command";
import { Repository } from "typeorm";
import { ActionDescriptor } from "../../models/action.entity";
import { Platform } from "../../../../constants";
import { DiscordUtil } from "../../util";
import { Autocomplete, AutocompleteReturn } from "./autocomplete";
import { ISlashCommand, SlashCommand } from "./slash-command";
import { InjectRepository } from "@nestjs/typeorm";

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("quick-setup")
        .setDescription("Quick setup for default configuration. Creates multiple actions.")
        .setDMPermission(false)
        .addSubcommand(general =>
            general
                .setName("general")
                .setDescription("General setup for a channel.")
                .addStringOption(platform => DiscordUtil.makePlatformOption(platform).setRequired(true))
                .addStringOption(channel =>
                    channel
                        .setName("channel")
                        .setDescription("The channel's ID or handle.")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addRoleOption(pingRole =>
                    pingRole.setName("ping-role").setDescription("The role to ping on certain events."),
                )
                .addChannelOption(notificationChannel =>
                    notificationChannel
                        .setName("notif-channel")
                        .setDescription("The notification channel that should be used."),
                )
                .addChannelOption(streamChat =>
                    streamChat
                        .setName("stream-chat")
                        .setDescription("The stream chat. Will be unlocked on live, locked on offline."),
                )
                .addChannelOption(tagsChannel =>
                    tagsChannel
                        .setName("tags-channel")
                        .setDescription("The tags channel. !tags {link} will be sent here on offline."),
                ),
        )
        .addSubcommand(rename =>
            rename
                .setName("rename")
                .setDescription("Configure rename actions for live & offline.")
                .addStringOption(platform => DiscordUtil.makePlatformOption(platform).setRequired(true))
                .addStringOption(channel =>
                    channel
                        .setName("channel")
                        .setDescription("The channel ID or handle.")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addStringOption(name =>
                    name.setName("name").setDescription("This channel's base name.").setRequired(true),
                )
                .addChannelOption(forChannel =>
                    forChannel.setName("for-channel").setDescription("The channel to rename."),
                ),
        ),
})
export class QuickSetupCommand implements ISlashCommand {
    private readonly logger = new Logger(QuickSetupCommand.name);

    constructor(
        @InjectRepository(ActionDescriptor)
        private readonly actionsRepo: Repository<ActionDescriptor>,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
    ) {}

    // used to keep track of selected options for each interaction
    private readonly optionMap = new Map<
        string,
        {
            "convenience-options": Set<string>;
            "notification-options": Set<string>;
        }
    >();

    private getOptions(interaction: ChatInputCommandInteraction) {
        const { options } = interaction;

        const channelId = options.getString("channel"),
            platform = options.getString("platform") as Platform,
            notificationChannel = options.getChannel("notif-channel", false),
            streamChannel = options.getChannel("stream-chat", false),
            tagsChannel = options.getChannel("tags-channel", false),
            pingRole = options.getRole("ping-role", false);

        return {
            channelId,
            platform,
            notificationChannel,
            streamChannel,
            tagsChannel,
            pingRole,
        };
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        if (!interaction.guildId) {
            interaction.reply("This command can only be used in a server.");
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "general") {
            await this.handleGeneral(interaction);
        } else if (subcommand === "rename") {
            await this.handleRename(interaction);
        }
    }

    async handleRename(interaction: ChatInputCommandInteraction<CacheType>) {
        const { options, channel } = interaction;

        const { channelId, platform } = this.getOptions(interaction);
        const discordChannel = interaction.options.getChannel("for-channel", false) as GuildTextBasedChannel;

        const name = interaction.options.getString("name");

        const {
            success,
            channel: { name: channelName, platformId: guaranteedChannelId },
        } = await this.commandBus.execute(
            new EnsureChannelCommand(channelId, platform),
        );
        if (!success) {
            return interaction.reply({
                content: "Channel not found.",
                ephemeral: true,
            });
        }

        const { discordChannelId, discordThreadId } = DiscordUtil.getChannelIds(discordChannel ?? channel);

        const savedActions = await this.actionsRepo.save([
            this.actionsRepo.create({
                guildId: interaction.guildId,
                discordChannelId,
                discordThreadId,
                channelId,
                platform,
                type: "rename",
                onEvent: "live",
                data: {
                    name: `🔴 ${name}`,
                },
            }),
            this.actionsRepo.create({
                guildId: interaction.guildId,
                discordChannelId,
                discordThreadId,
                channelId,
                platform,
                type: "rename",
                onEvent: "offline",
                data: {
                    name: `⚫ ${name}`,
                },
            }),
        ]);

        this.logger.debug(`Saved ${savedActions.length} actions.`);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Quick Setup")
                    .setDescription(`Configured rename actions for ${channelName} (${guaranteedChannelId})`)
                    .setColor("Green")
                    .addFields(savedActions.map(action => action.toEmbedField())),
            ],
        });
    }

    async handleGeneral(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        this.optionMap.set(interaction.id, {
            "convenience-options": new Set(),
            "notification-options": new Set(),
        });

        await interaction.deferReply();

        const { channelId, platform, notificationChannel, streamChannel, tagsChannel } = this.getOptions(interaction);

        if (!notificationChannel && !streamChannel && !tagsChannel)
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder({
                        description: "No channels to configure actions for. What exactly do you want me to do here?",
                    }),
                ],
            });

        const {
            success,
            channel: { name },
        } = await this.commandBus.execute(
            new EnsureChannelCommand(channelId, platform),
        );
        if (!success)
            await interaction.reply({
                embeds: [new EmbedBuilder({ description: "Invalid id." }).setColor("Red")],
            });

        const notificationOptions: SelectMenuOptionBuilder[] = [];
        const convenienceOptions: SelectMenuOptionBuilder[] = [];

        if (notificationChannel) {
            notificationOptions.push(
                new SelectMenuOptionBuilder()
                    .setLabel("Live & Uploads")
                    .setValue("live-and-uploads")
                    .setDescription("Send notifications when streams go live in the notification channel."),
                new SelectMenuOptionBuilder({
                    label: "Offline (Notification channel)",
                    value: "offline:notif",
                    description: "Send notifications when a stream goes offline in the notification channel.",
                }),
            );

            if (platform === "youtube") {
                notificationOptions.push(
                    new SelectMenuOptionBuilder({
                        label: "Community Posts",
                        value: "community-posts",
                        description: "Send notifications when a community post is made in the notification channel.",
                    }),
                );
            }
        }

        if (streamChannel) {
            notificationOptions.push(
                new SelectMenuOptionBuilder({
                    label: "Offline (Stream chat)",
                    value: "offline:stream",
                    description: "Send notifications when a stream goes offline in the stream chat.",
                }),
            );

            convenienceOptions.push(
                new SelectMenuOptionBuilder({
                    label: "Automatic KoroTagger Setup",
                    value: "auto-korotagger",
                    description: "Echo !stream {link} for KoroTagger in stream chat when a stream goes live.",
                }),
                new SelectMenuOptionBuilder({
                    label: "No automatic lock & unlock",
                    value: "no-lock",
                    description: "Don't automatically lock and unlock the stream channel.",
                }),
            );
        }

        if (tagsChannel) {
            convenienceOptions.push(
                new SelectMenuOptionBuilder({
                    label: "Send tags",
                    value: "tags",
                    description: "Use KoroTagger to print tags in the tags channel.",
                }),
            );
        }

        const components: ActionRowBuilder[] = [];

        components.push(
            new ActionRowBuilder().addComponents(
                new SelectMenuBuilder()
                    .setPlaceholder("Notification options")
                    .setMinValues(0)
                    .setMaxValues(notificationOptions.length)
                    .setCustomId("notification-options")
                    .setOptions(notificationOptions),
            ),
            new ActionRowBuilder().addComponents(
                new SelectMenuBuilder()
                    .setPlaceholder("Convenience options")
                    .setMinValues(0)
                    .setMaxValues(convenienceOptions.length)
                    .setCustomId("convenience-options")
                    .setOptions(convenienceOptions),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("submit").setLabel("Submit").setStyle(ButtonStyle.Primary),
            ),
        );

        const reply = (await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Quick Setup")
                    .setDescription(`Configure actions for ${name} (${channelId}, ${platform})`)
                    .setColor("Blue"),
            ],
            // @ts-ignore
            components,
        })) as Message;

        const componentCollector = reply.createMessageComponentCollector();
        componentCollector.on("collect", async componentInteraction => {
            switch (componentInteraction.customId) {
                case "notification-options":
                case "convenience-options":
                    const newSet = new Set((componentInteraction as SelectMenuInteraction).values);
                    this.optionMap.get(interaction.id)[componentInteraction.customId] = newSet;

                    await componentInteraction.reply({
                        content: "Options set.",
                        ephemeral: true,
                    });
                    break;
                case "submit":
                    await this.handleSubmit(interaction, componentInteraction as MessageComponentInteraction);
            }
        });
    }

    private async handleSubmit(
        interaction: ChatInputCommandInteraction<CacheType>,
        componentInteraction: MessageComponentInteraction,
    ) {
        const { "convenience-options": convenienceOptions, "notification-options": notificationOptions } =
            this.optionMap.get(interaction.id);
        const selectedOptions = new Set([...convenienceOptions, ...notificationOptions]);

        // check if the user selected any options defined in notificationOptions
        if (selectedOptions.size === 0) {
            await componentInteraction.reply({
                embeds: [
                    new EmbedBuilder({
                        description: "You must select at least one option.",
                    }).setColor("Red"),
                ],
            });
            return;
        }

        const nanoid: () => string = (await Function('return import("nanoid")')()).customAlphabet(
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-",
            9,
        );

        const { channelId, platform, notificationChannel, streamChannel, tagsChannel, pingRole } =
            this.getOptions(interaction);

        const actions: Partial<ActionDescriptor>[] = [];

        if (selectedOptions.has("live-and-uploads")) {
            const { discordChannelId, discordThreadId } = DiscordUtil.getChannelIds(
                notificationChannel as GuildBasedChannel,
            );

            actions.push({
                id: nanoid(),
                channelId,
                platform,
                type: "notify",
                onEvent: "live",
                discordChannelId,
                discordThreadId,
                guildId: interaction.guildId,
                data: {
                    message: `${pingRole ? `<@&${pingRole.id}>` : ""} {link} is now live!`,
                },
            });

            actions.push({
                id: nanoid(),
                channelId,
                platform,
                type: "notify",
                onEvent: "upload",
                discordChannelId,
                discordThreadId,
                guildId: interaction.guildId,
                data: {
                    message: `New upload: ${pingRole ? `<@&${pingRole.id}>` : ""} {link}`,
                },
            });
        }

        if (selectedOptions.has("offline:notif") || selectedOptions.has("offline:stream")) {
            const useNotifChannel = selectedOptions.has("offline:notif");

            const { discordChannelId, discordThreadId } = DiscordUtil.getChannelIds(
                (useNotifChannel ? notificationChannel : streamChannel) as GuildBasedChannel,
            );

            actions.push({
                id: nanoid(),
                channelId,
                platform,
                type: "notify",
                onEvent: "offline",
                discordChannelId,
                discordThreadId,
                guildId: interaction.guildId,
                data: {
                    message: "{link} is now offline.",
                },
            });
        }

        if (selectedOptions.has("community-posts")) {
            const { discordChannelId, discordThreadId } = DiscordUtil.getChannelIds(
                notificationChannel as GuildBasedChannel,
            );

            actions.push({
                id: nanoid(),
                channelId,
                platform,
                type: "notify",
                onEvent: "post",
                discordChannelId,
                discordThreadId,
                guildId: interaction.guildId,
                data: {
                    message: `${pingRole ? `<@&${pingRole.id}>` : ""} {link}`,
                },
            });
        }

        if (selectedOptions.has("tags")) {
            const { discordChannelId, discordThreadId } = DiscordUtil.getChannelIds(tagsChannel as GuildBasedChannel);

            actions.push({
                id: nanoid(),
                channelId,
                platform,
                type: "echo",
                onEvent: "offline",
                discordChannelId,
                discordThreadId,
                guildId: interaction.guildId,
                data: {
                    message: "!tags {link}",
                },
            });
        }

        if (!selectedOptions.has("no-lock")) {
            const { discordChannelId, discordThreadId } = DiscordUtil.getChannelIds(streamChannel as GuildBasedChannel);

            actions.push({
                id: nanoid(),
                channelId,
                platform,
                type: "lock",
                onEvent: "offline",
                discordChannelId,
                discordThreadId,
                guildId: interaction.guildId,
                data: {
                    message: "Channel locked.",
                    mode: "lock",
                },
            });

            actions.push({
                id: nanoid(),
                channelId,
                platform,
                type: "lock",
                onEvent: "live",
                discordChannelId,
                discordThreadId,
                guildId: interaction.guildId,
                data: {
                    message: "Channel unlocked.",
                    mode: "unlock",
                },
            });
        }

        if (selectedOptions.has("auto-korotagger")) {
            const { discordChannelId, discordThreadId } = DiscordUtil.getChannelIds(streamChannel as GuildBasedChannel);

            actions.push({
                id: nanoid(),
                discordChannelId,
                discordThreadId,
                channelId,
                platform,
                type: "echo",
                onEvent: "live",
                guildId: interaction.guildId,
                data: {
                    message: "!stream {link}",
                },
            });
        }

        const savedActions = (await this.actionsRepo.save(actions)).map(action => this.actionsRepo.create(action));
        this.logger.debug(
            `Saved ${savedActions.length} actions: ${savedActions.map(action => action.type).join(", ")}`,
        );

        await componentInteraction.reply({
            embeds: [
                new EmbedBuilder({ description: "Actions saved." })
                    .setColor("Green")
                    .addFields(savedActions.map(action => action.toEmbedField())),
            ],
        });
    }

    @Autocomplete("channel")
    private async getChannel(interaction: AutocompleteInteraction): Promise<AutocompleteReturn> {
        return DiscordUtil.handleChannelAutocomplete(interaction, this.queryBus);
    }
}
