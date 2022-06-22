import { AutocompleteInteraction } from "discord.js";
import { ISlashCommand } from "./slash-command";

const autocompleteKey = Symbol("AUTOCOMPLETE");
export type AutocompleteReturn = { name: string; value: string }[];

export const Autocomplete =
    (activeOption: string): MethodDecorator =>
    (
        target: { new (...args: any[]): ISlashCommand },
        key: string,
        _descriptor,
    ) => {
        if (!Reflect.hasMetadata(autocompleteKey, target))
            Reflect.defineMetadata(autocompleteKey, new Map(), target);
        const data: Map<string, string | symbol> = Reflect.getMetadata(
            autocompleteKey,
            target,
        );
        data.set(activeOption, key);
        Reflect.defineMetadata(autocompleteKey, data, target);
    };

export const handleAutocomplete = async (
    interaction: AutocompleteInteraction,
    instance: ISlashCommand,
) => {
    const { options } = interaction;
    const autocompletes = Reflect.getMetadata(autocompleteKey, instance) as
        | Map<string, string>
        | undefined;

    const { name, value } = options.getFocused(true);
    if (!autocompletes)
        throw new Error(`Could not find autocompletes for ${name}.`);

    const key = autocompletes.get(name);
    if (!key)
        throw new Error(
            `Error handling autocomplete: Could not find key for option ${name} in instance.`,
        );
    const response: AutocompleteReturn = await instance[key]?.(
        value,
        interaction,
    );
    if (!response)
        throw new Error(
            `Error handling autocomplete ${name}: Got no response object.`,
        );

    return interaction.respond(response);
};
