import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { getParameters } from "./slash-command.constants";
import { SlashCommandDiscovery } from "./slash-command.discovery";
import { ISlashCommandDispatcher } from "./slash-command.types";

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
            } else {
                args.push(interaction.options.get(parameter.value.name, parameter.value.required));
            }
        }

        const reply = await handler.methodRef(...args);

        if (interaction.replied || !reply) return;
        await interaction.reply(reply);
    }

    private makeIdentifier({ commandName, options }: ChatInputCommandInteraction): string {
        return [commandName, options.getSubcommandGroup(false), options.getSubcommand(false)].filter(n => n).join(".");
    }
}
