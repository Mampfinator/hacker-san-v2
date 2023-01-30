import { Injectable, Logger } from "@nestjs/common";
import { ChatInputCommandInteraction, CacheType, DiscordAPIError, EmbedBuilder, Colors } from "discord.js";
import { OptionType } from "./decorators/option.decorator.types";
import { CommandIdentifier, getParameters } from "./slash-command.constants";
import { SlashCommandDiscovery } from "./slash-command.discovery";
import { ISlashCommandDispatcher } from "./slash-command.types";

const METHOD_LOOKUP_TABLE = {
    [OptionType.String]: "getString",
    [OptionType.Integer]: "getInteger",
    [OptionType.Boolean]: "getBoolean",
    [OptionType.User]: "getMember",
    [OptionType.Channel]: "getChannel",
    [OptionType.Role]: "getRole",
    [OptionType.Mentionable]: "getMentionable",
    [OptionType.Number]: "getNumber",
    [OptionType.Attachment]: "getAttachment",
};

@Injectable()
export class SlashCommandDispatcher implements ISlashCommandDispatcher {
    private readonly logger = new Logger(SlashCommandDispatcher.name);
    constructor(private readonly discovery: SlashCommandDiscovery) {}

    async dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
        const handler = this.discovery.getHandler(this.makeIdentifier(interaction));
        const parameters = getParameters(handler.constructor, handler.methodName);
        const args: any[] = [];

        for (const parameter of parameters) {
            if (!parameter)
                throw new TypeError(
                    `Could not resolve parameter at index ${parameters.indexOf(parameter)} for ${
                        handler.constructor.name
                    }.${String(handler.methodName)}!`,
                );

            if (parameter.type === "interaction") {
                args.push(interaction);
            } else if (parameter.type === "options") {
                const {
                    value: { name, required },
                } = parameter;
                const { options } = interaction;

                const option = options.get(name, required);
                if (!option) {
                    args.push(undefined);
                    continue;
                }

                const methodName = METHOD_LOOKUP_TABLE[option.type];
                args.push(options[methodName](name, required));
            }
        }

        try {
            const reply = await handler.instance[handler.methodName](...args);
            if (!reply) return;
            await interaction[interaction.deferred || interaction.replied ? "editReply" : "reply"](reply);
        } catch (error) {
            if (error instanceof DiscordAPIError) return;

            this.logger.error(error);

            await interaction[interaction.deferred || interaction.replied ? "editReply" : "reply"]({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("Something went wrong!")
                        .setDescription("This is an internal error and likely not your fault. If the error persists, please reach out the bot developer.")
                ]
            });
        }
    }

    private makeIdentifier({ commandName, options }: ChatInputCommandInteraction): Partial<CommandIdentifier> {
        const subcommandGroupName = options.getSubcommandGroup(false),
            subcommandName = options.getSubcommand(false);

        return {
            commandName,
            subcommandGroupName,
            subcommandName,
        };
    }
}
