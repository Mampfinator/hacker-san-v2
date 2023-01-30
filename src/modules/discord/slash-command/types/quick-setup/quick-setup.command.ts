import { CommandBus } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import {
    CategoryChannel,
    Channel as DiscordChannel,
    ChannelType,
    ChatInputCommandInteraction,
    Colors,
    DiscordAPIError,
    EmbedBuilder,
    GuildChannel,
    NewsChannel,
    PublicThreadChannel,
    Role as DiscordRole,
    TextChannel,
} from "discord.js";
import { DeepPartial, Repository } from "typeorm";
import { Platform, PLATFORM_NAME_LOOKUP } from "../../../../../constants";
import { EnsureChannelCommand } from "../../../../platforms/commands/ensure-channel.command";
import { ActionDescriptor } from "../../../models/action.entity";
import { PLATFORM_CHOICES } from "../../../util";
import { Command } from "../../decorators/command.decorator";
import { Interaction } from "../../decorators/interaction.decorator";
import { Boolean, Channel, Role, String } from "../../decorators/option.decorator";
import { SlashCommand } from "../../decorators/slash-command.decorator";
import { CHANNELID_OPTIONS, PLATFORM_OPTIONS } from "../../slash-command.constants";
import { SlashCommandError } from "../../slash-command.errors";
import { makeGeneralActions, makeThreadActions } from "./quick-command.constants";
@SlashCommand({
    name: "quick-setup",
    description: "Quickly set up actions for channels",
    subcommandGroups: [
        {
            name: "preset",
            description: "Set up a variety of presets",
        },
    ],
})
export class QuickSetupCommand {
    constructor(
        private readonly commandBus: CommandBus,
        @InjectRepository(ActionDescriptor) private readonly actions: Repository<ActionDescriptor>,
    ) {}

    @Command({
        name: "default",
        group: "preset",
        description: "General setup for a channel. Does not include notifications for posts.",
    })
    async general(
        @String({
            name: "platform",
            description: "What platform these notifications should be for.",
            required: true,
            choices: PLATFORM_CHOICES,
        })
        platform: Platform,
        @String({ name: "channel", description: "The channel's ID or handle.", required: true })
        channelId: string,
        @Interaction() interaction: ChatInputCommandInteraction<"cached">,
        @Role({ name: "pingrole", description: "A role to ping for whatever you're setting up." })
        pingRole?: DiscordRole,
        @String({
            name: "talent-name",
            description: "Talent name to use for announcements. Required if notif-channel is set.",
        })
        talentName?: string,
        @Channel({ name: "notif-channel", description: "Channel to send notifications in." })
        notifChannel?: TextChannel | NewsChannel,
        @Channel({
            name: "stream-channel",
            description: "Stream channel. If you want to set up temporary threads here, enable temp-threads.",
        })
        streamChannel?: TextChannel | PublicThreadChannel,
        @String({
            name: "stream-channel-name",
            description: "Name to use as base for renaming Actions. Prefixed with 🔴/⚫.",
        })
        streamChannelName?: string,
        @Channel({
            name: "tags-channel",
            description:
                "Channel to send tags in after a stream is over. If not set and temp-threads is enabled, sends in temp thread.",
        })
        tagsChannel?: TextChannel | PublicThreadChannel,
        @Boolean({
            name: "temp-threads",
            description: "Use temporary chats in stream-chat for all stream related actions.",
        })
        tempThreads?: boolean,
    ) {
        if (!notifChannel && !streamChannel && !tagsChannel)
            throw new SlashCommandError()
                .setName("What exactly do you want me to do?")
                .setReason("At least one of `notif-channel`, `stream-chanel` or `tags-channel` need to be set.");

        await interaction.deferReply();
        const base = { guildId: interaction.guildId, platform, channelId };

        const actions = this.actions.create(
            makeGeneralActions({
                ...base,
                pingRoleId: pingRole.id,
                talentName,
                notifChannelId: notifChannel.id,
                streamChannelId: streamChannel.id,
                streamChannelName: streamChannelName ?? streamChannel.name,
                tagsChannelId: tagsChannel.id,
                tempThreads,
            }),
        );
        await this.actions.insert(actions);

        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle("Quick setup completed")
                    .setDescription(`Added ${actions.length} Actions: `)
                    .addFields(actions.map(action => action.toEmbedField())),
            ],
        };
    }

    @Command({ name: "rename", group: "preset", description: "Set up live indicator emojis for a channel." })
    async rename(
        @String(PLATFORM_OPTIONS) platform: Platform,
        @String(CHANNELID_OPTIONS) channelId: string,
        @Channel({ name: "for-channel", description: "The channel to set up", required: true })
        discordChannel: GuildChannel,
        @Interaction() interaction: ChatInputCommandInteraction,
        @String({
            name: "base-name",
            description: "Will be prefixed with 🔴/⚫. Defaults to selected channel's name.",
        })
        baseName?: string,
    ) {
        await interaction.deferReply();

        const name = baseName ?? discordChannel.name;
        const { success, channel } = await this.commandBus.execute(new EnsureChannelCommand(channelId, platform));
        const { guildId } = interaction;

        if (!success)
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("Setup failed")
                        .setDescription(
                            "This likely means that the channel you were attempting to set up does not exist.",
                        ),
                ],
            };

        const actions = [
            this.actions.create({
                guildId,
                discordChannelId: discordChannel.id,
                channelId: channel.platformId,
                platform,
                type: "rename",
                onEvent: "live",
                data: {
                    name: `🔴 ${name}`,
                },
            }),
            this.actions.create({
                guildId,
                discordChannelId: discordChannel.id,
                channelId: channel.platformId,
                platform,
                type: "rename",
                onEvent: "offline",
                data: {
                    name: `⚫ ${name}`,
                },
            }),
        ];

        try {
            await this.actions.insert(actions);
        } catch {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("Setup failed")
                        .setDescription(
                            "Failed creating new actions. This is likely an internal error, or you already have those same actions set up. If the problem persists, reach out to the bot developer!",
                        ),
                ],
            };
        }

        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle("Actions created")
                    .setDescription(
                        `Created two rename actions for ${channel.name} (${channel.platform}, ${channel.platformId}):`,
                    )
                    .addFields(...actions.map(action => action.toEmbedField())),
            ],
        };
    }

    @Command({
        name: "talent-category",
        group: "preset",
        description: "Set up a new category for a single talent. Useful in multi-talent servers.",
    })
    async talentCategory(
        @String(PLATFORM_OPTIONS) platform: Platform,
        @String(CHANNELID_OPTIONS) rawChannelId: string,
        @Interaction() interaction: ChatInputCommandInteraction,
        @String({
            name: "live-message",
            description: "Message to send on live. Supports {interpolation}.",
            required: true,
        })
        liveMessage: string,
        @String({
            name: "upload-message",
            description: "Message to send on upload. Supports {interpolation}.",
            required: true,
        })
        uploadMessage: string,
        @String({
            name: "post-message",
            description: "Message to send on post. Supports {interpolation}.",
            required: true,
        })
        postMessage: string,
        @Channel({
            name: "stream-channel",
            description: "Channel to use as a stream chat. If no channels are set, will create a new category.",
            channel_types: [ChannelType.GuildText],
        })
        streamChannel?: TextChannel,
        @Channel({
            name: "notif-channel",
            description:
                "Channel to use as a notification channel. If no channels are set, will create a new category.",
            channel_types: [ChannelType.GuildAnnouncement, ChannelType.GuildText],
        })
        notifChannel?: TextChannel | NewsChannel,
        @Channel({
            name: "in-category",
            description: "Category to append new channels to if either is not provided.",
            channel_types: [ChannelType.GuildCategory],
        })
        category?: CategoryChannel,
        @String({
            name: "talent-chat-name",
            description:
                'Base name to use for renaming. If left blank, defaults to provided channel\'s name or "talent-chat".',
        })
        talentChatName?: string,
    ) {
        await interaction.deferReply();
        const { me } = interaction.guild.members;
        const { channel, success } = await this.commandBus.execute(new EnsureChannelCommand(rawChannelId, platform));
        if (!success)
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("Setup failed")
                        .setDescription(
                            `The specified ${PLATFORM_NAME_LOOKUP[platform]}-channel \`${rawChannelId}\` does not exist.`,
                        ),
                ],
            };

        const { platformId: channelId } = channel;
        const { guildId } = interaction;

        if (!category) {
            try {
                category = await interaction.guild.channels.create({
                    type: ChannelType.GuildCategory,
                    name: "New Talent Category",
                });
            } catch (error) {
                if (error instanceof DiscordAPIError) {
                    return {
                        embeds: [
                            new EmbedBuilder()
                                .setColor(Colors.Red)
                                .setDescription(
                                    "Something went wrong trying to create a new talent category! I'm probably missing the required permissions.\n Either provide a category of your own, or make sure I have the necessary permissions to create new categories.",
                                ),
                        ],
                    };
                }
            }
        }

        const missingCreateChannelPerms = `I can't create channels in ${category}.`;
        const errors: Set<string> = new Set();

        if (!streamChannel) {
            try {
                streamChannel = await category.children.create({
                    type: ChannelType.GuildText,
                    name: "talent-chat",
                });
            } catch (error) {
                if (error instanceof DiscordAPIError) errors.add(missingCreateChannelPerms);
                // TODO figure out correct discord.js error code for missing permissions
                else throw error;
            }
        } else {
            if (streamChannel.parentId !== category.id) await streamChannel.setParent(category);
            const permissions = streamChannel.permissionsFor(me);

            if (!permissions.has("CreatePublicThreads"))
                errors.add(`I need to be able to create public Threads in ${streamChannel}.`);
            if (!permissions.has("SendMessagesInThreads"))
                errors.add(`I need to be able to send message in Threads in ${streamChannel}.`);
            if (!permissions.has("ManageChannels"))
                errors.add(`I need to be able to manage ${streamChannel} for renaming.`);
        }

        if (!notifChannel) {
            try {
                notifChannel = await category.children.create({
                    type: ChannelType.GuildAnnouncement,
                    name: "notifications",
                });
            } catch (error) {
                if (error instanceof DiscordAPIError) errors.add(missingCreateChannelPerms);
                else throw error;
            }
        } else {
            if (notifChannel.parentId !== category.id) await notifChannel.setParent(category);
            if (!notifChannel.permissionsFor(me).has(["SendMessages"]))
                errors.add(`I need to be able to send messages in ${notifChannel}.`);
        }

        if (errors.size > 0) {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription(
                            `There were ${errors.size} (likely permission) errors while parsing & making channels. See below for details.`,
                        )
                        .addFields({
                            name: "Errors",
                            value: Array.from(errors)
                                .map(e => `\u0009\u2022 ${e}`)
                                .join("\n"),
                        }),
                ],
            };
        }

        const base = { guildId, channelId, platform };

        const actions = this.actions.create(
            makeThreadActions({
                guildId,
                platform,
                channelId,

                streamChannelId: streamChannel.id,
                streamChannelName: streamChannel.name,
                notifChannelId: notifChannel.id,
                liveMessage,
                uploadMessage,
                postMessage,
            }),
        );

        await this.actions.save(actions);

        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle("Thread Setup")
                    .setDescription("Completed setting up thread actions. See below for details.")
                    .addFields(...actions.map(action => action.toEmbedField())),
            ],
        };
    }
}
