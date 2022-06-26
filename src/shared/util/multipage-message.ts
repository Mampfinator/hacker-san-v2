import {
    CacheType,
    CommandInteraction,
    InteractionCollector,
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentCollectorOptions,
    MessageComponentInteraction,
    MessageEditOptions,
    MessageEmbed,
    MessageOptions,
    ReplyMessageOptions,
    TextBasedChannel,
} from "discord.js";

type ComponentId = "first" | "back" | "next" | "last";
const componentIds = new Set<ComponentId>(["first", "back", "next", "last"]);

export class MultipageMessage {
    private readonly pages: MessageOptions[] = [];
    private index = 0;
    private message?: Message;

    private readonly channel?: TextBasedChannel;
    private readonly interaction?: CommandInteraction<any>;

    private readonly componentCollectorOptions: MessageComponentCollectorOptions<MessageComponentInteraction>;

    constructor(options: {
        channel?: TextBasedChannel;
        interaction?: CommandInteraction<any>;
        collectorOptions?: MessageComponentCollectorOptions<MessageComponentInteraction>;
    }) {
        this.channel = options.channel;
        this.interaction = options.interaction;
        if (!this.channel && !this.interaction) throw new Error("No channel or interaction provided");
        
        this.componentCollectorOptions = options.collectorOptions ?? {};
    }

    public addPage(message: MessageOptions): number {
        return this.pages.push(message);
    }

    public async send(options?: {asReply?: boolean; message?: Message, replyOptions?: ReplyMessageOptions }) {
        // scuff, but works
        const page = this.setupMessage(this.pages[this.index]) as any;

        let message: Message;
        switch (true) {
            case options.asReply:
                message = await options.message.reply({...page, ...(options.replyOptions ?? {})});
                console.log(message);
                break;
            case this.channel !== undefined:
                message = await this.channel.send(page);
                break;
            case this.interaction.deferred || this.interaction.replied:
                message = await this.interaction.editReply(page);
                break;
            default:
                message = await this.interaction.reply({
                    ...page,
                    fetchReply: true,
                });
        }

        this.message = message;

        const collector =
            message.createMessageComponentCollector(this.componentCollectorOptions);
        collector.on("collect", async interaction => {
            await this.handleCollect(interaction.customId as ComponentId);
            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setDescription(
                            `Now viewing page ${this.index + 1}/${
                                this.pages.length
                            }`,
                        )
                        .setColor("GREEN"),
                ],
                ephemeral: true,
            });
        });

        collector.on("end", () => {
            this.message?.edit(this.pages[this.index] as MessageEditOptions); // remove navigation components
        });
    }

    private async handleCollect(command: ComponentId) {
        if (!componentIds.has(command)) return;

        switch (command) {
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
        }
        await this.edit();
    }

    private async edit() {
        const message = this.setupMessage(this.pages[this.index]) as any;

        if (this.channel) await this.message.edit(message);
        else await this.interaction.editReply(message);
    }

    private setupMessage(message: MessageOptions): MessageOptions {
        const components = [...(message.components ?? [])];

        const row = new MessageActionRow<MessageButton>().addComponents(
            new MessageButton()
                .setCustomId("first")
                .setEmoji("⬅️")
                .setDisabled(this.index <= 0)
                .setStyle("SECONDARY"),
            new MessageButton()
                .setCustomId("back")
                .setEmoji("◀️")
                .setDisabled(this.index <= 0)
                .setStyle("SECONDARY"),
            new MessageButton()
                .setCustomId("next")
                .setEmoji("▶️")
                .setDisabled(this.index == this.pages.length - 1)
                .setStyle("SECONDARY"),
            new MessageButton()
                .setCustomId("last")
                .setEmoji("➡️")
                .setDisabled(this.index == this.pages.length - 1)
                .setStyle("SECONDARY"),
        );

        components.push(row);

        return { ...message, components };
    }
}
