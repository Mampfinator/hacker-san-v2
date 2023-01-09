import { ChannelType, EmbedBuilder } from "discord.js";
import { DiscordClientService } from "../../client/discord-client.service";
import { Action, IActionType } from "../decorators/action";
import { generateEmbed, interpolate, needsEmbed } from "../action.util";
import { ActionExecuteOptions } from "../action.interfaces";

@Action({ type: "notify" })
export class NotifyAction implements IActionType {
    constructor(private readonly client: DiscordClientService) {}

    async execute({ descriptor, payload }: ActionExecuteOptions) {
        const channel = await this.client.channels.fetch(descriptor.discordChannelId);

        if (channel.type !== ChannelType.GuildText) return;

        const { message } = descriptor.data as { message: string };

        const notification: { content: string; embeds?: EmbedBuilder[] } = {
            content: interpolate(message, { descriptor, payload }),
<<<<<<< HEAD
            embeds: needsEmbed(payload) ? [generateEmbed(payload)] : undefined,
=======
>>>>>>> 8179ca5 (Some major fixes)
        };
        
        await channel.send(notification);
    }
}
