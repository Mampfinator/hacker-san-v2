import { channelLink, ChannelType } from "discord.js";
import { DiscordClientService } from "../../discord-client.service";
import { Action, IActionType } from "../decorators/action";
import { interpolate } from "../action.util";
import { ActionExecuteOptions } from "../action.interfaces";

@Action({ type: "echo" })
export class EchoAction implements IActionType {
    constructor(private readonly client: DiscordClientService) {}

    async execute({ descriptor, payload }: ActionExecuteOptions) {
        const { message } = descriptor.data as { message: string };
        const channel = await this.client.channels.fetch(descriptor.discordChannelId);

        if (
            channel.type === ChannelType.GuildText ||
            channel.type === ChannelType.PublicThread ||
            channel.type === ChannelType.PrivateThread
        ) {
            await channel.send(interpolate(message, { descriptor, payload }));
        }
    }
}
