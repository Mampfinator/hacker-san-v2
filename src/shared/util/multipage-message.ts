import {
    BaseMessageOptions,
    CommandInteraction,
    Message,
    MessageComponentCollectorOptions,
    TextBasedChannel,
    BaseChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    APIActionRowComponent,
    InteractionResponse,
    ChatInputCommandInteraction,
    EmbedBuilder,
} from "discord.js";
import { RequireOnlyOne } from "yt-scraping-utilities/dist/util";

type ComponentId = "first" | "back" | "next" | "last";

interface BaseMultipageMessageOptions {
    channel: TextBasedChannel;
    message: Message;
    interaction: CommandInteraction;

    collectorOptions?: MessageComponentCollectorOptions<any>;
}

export type MultipageMessageOptions = RequireOnlyOne<
    BaseMultipageMessageOptions,
    "channel" | "message" | "interaction"
>;

export interface SendOptions {
    /**
     * Only valid if sendTarget is Message.
     */
    replyPing?: boolean;

    /**
     * Only valid if sendTarget is CommandInteraction.
     */
    ephemeral?: boolean;
}

export class MultipageMessage {
    private _index = 0;
    private pages: BaseMessageOptions[] = [];
    private message: Message | InteractionResponse;

    private readonly sendTarget:
        | TextBasedChannel
        | Message
        | CommandInteraction;
    private collectorOptions: MessageComponentCollectorOptions<any>;

    constructor(options: MultipageMessageOptions) {
        this.collectorOptions = options.collectorOptions ?? {};
        this.sendTarget =
            options.channel ?? options.message ?? options.interaction;
    }

    public get index() {
        return this._index;
    }

    private set index(value: number) {
        this._index = value;
    }

    public addPage(message: BaseMessageOptions) {
        return this.pages.push(message);
    }

    private addNavigation(page: BaseMessageOptions): BaseMessageOptions {
        const navigationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("first")
                .setEmoji("⬅️")
                .setDisabled(this.index <= 0)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("back")
                .setEmoji("◀️")
                .setDisabled(this.index <= 0)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("next")
                .setEmoji("▶️")
                .setDisabled(this.index == this.pages.length - 1)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("last")
                .setEmoji("➡️")
                .setDisabled(this.index == this.pages.length - 1)
                .setStyle(ButtonStyle.Secondary),
        );

        const components: ActionRowBuilder<any>[] = [
            ...((page.components as APIActionRowComponent<any>[])?.map(
                ActionRowBuilder.from,
            ) ?? []),
            navigationRow,
        ];
        components.push(navigationRow);

        return { ...page, components: components.map(row => row.toJSON()) };
    }

    public async send(options?: SendOptions) {
        if (this.pages.length == 0)
            throw new Error("Can not send a multipage message with 0 pages.");
        if (this.pages.length == 1)
            throw new Error(
                "Can not send a multipage message with only 1 page.",
            );

        const page = this.addNavigation(this.pages[0]);

        switch (true) {
            case this.sendTarget instanceof BaseChannel:
                this.message = await (this.sendTarget as TextBasedChannel).send(
                    page,
                );
                break;
            case this.sendTarget instanceof CommandInteraction:
                this.message = await (
                    this.sendTarget as CommandInteraction
                ).reply({
                    ...page,
                    ephemeral: options?.ephemeral ?? false,
                });
                break;
            case this.sendTarget instanceof Message:
                this.message = await (this.sendTarget as Message).reply({
                    ...page,
                    allowedMentions: {
                        repliedUser: options?.replyPing ?? false,
                    },
                });
                break;
            default:
                throw new Error(
                    "Could not send multipage embed: unknown send target type!",
                );
        }

        // TODO: find a way of doing this without @ts-ignore.
        //@ts-ignore
        const collector = this.message.createMessageComponentCollector({
            ...this.collectorOptions,
        });

        collector.on("collect", async interaction => {
            await this.handleCollect(interaction.customId as ComponentId);
            interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(
                            `Now showing page ${this.index + 1}/${
                                this.pages.length
                            }`,
                        ),
                ],
                ephemeral: true,
            });
        });

        return this.message;
    }

    private async handleCollect(componentId: ComponentId) {
        switch (componentId) {
            case "first":
                this.index = 0;
            case "back":
                this.index = Math.max(0, this.index - 1);
                break;
            case "next":
                this.index = Math.min(this.pages.length - 1, this.index + 1);
                break;
            case "last":
                this.index = this.pages.length - 1;
                break;
            default: // the component interaction was not meant for us; we just return and do nothing.
                return;
        }

        await this.edit();
    }

    private async edit() {
        const page = this.addNavigation(this.pages[this.index]);

        switch (true) {
            case this.message instanceof Message:
                {
                    await (this.message as Message).edit(page);
                }
                break;
            case this.message instanceof InteractionResponse:
                {
                    const interaction = this.message
                        .interaction as ChatInputCommandInteraction;
                    await interaction.editReply(page);
                }
                break;
            default:
                throw new Error(
                    "Invalid internal message value: " +
                        JSON.stringify(this.message),
                );
        }
    }
}
