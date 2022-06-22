import {
    CommandInteraction,
    Interaction,
    InteractionCollector,
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageEditOptions,
    MessageEmbed,
    MessageOptions,
    TextBasedChannel,
} from "discord.js";

type ComponentId = "first" | "back" | "next" | "last";
const componentIds = new Set<ComponentId>(["first", "back", "next", "last"]);

export class MultipageMessage {
    private readonly pages: MessageOptions[] = [];
    private index = 0;
    private message?: Message;
    private collector?: InteractionCollector<MessageComponentInteraction>; // probably fine to just remove?

    private readonly channel?: TextBasedChannel;
    private readonly interaction?: CommandInteraction<any>;

    constructor(options: {
        channel?: TextBasedChannel;
        interaction?: CommandInteraction<any>;
    }) {
        this.channel = options.channel;
        this.interaction = options.interaction;
    }

    public addPage(message: MessageOptions): number {
        return this.pages.push(message);
    }

    public async send() {
        // scuff, but works
        const page = this.setupMessage(this.pages[this.index]) as any;

        let message: Message;
        switch (true) {
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

        const collector = (this.collector =
            message.createMessageComponentCollector());
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
