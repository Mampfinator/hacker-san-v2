import { Injectable } from "@nestjs/common";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
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
    [OptionType.Attachment]: "getAttachment"
}


@Injectable()
export class SlashCommandDispatcher implements ISlashCommandDispatcher {
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
                const { value } = parameter;
                const { options } = interaction;
                const { type } = options.get(value.name, value.required) ?? {};

                const methodName = METHOD_LOOKUP_TABLE[type];


                args.push(
                    options[methodName](value.name, value.required)
                );

            }
        }

        const reply = await handler.methodRef(...args);

        if (interaction.replied || !reply) return;
        await interaction[interaction.deferred ? "editReply" : "reply"](reply);
    }

    private makeIdentifier({ commandName, options }: ChatInputCommandInteraction): Partial<CommandIdentifier> {
        const   subcommandGroupName = options.getSubcommandGroup(false),
                subcommandName = options.getSubcommand(false);

        return {
            commandName, 
            subcommandGroupName, 
            subcommandName,
        }
    }
}
