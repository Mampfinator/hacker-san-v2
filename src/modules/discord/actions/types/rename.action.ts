import { ChannelType } from "discord.js";
import { DiscordClientService } from "../../client/discord-client.service";
import { Action, ActionExecuteOptions , IActionType } from "../decorators/action";

@Action({ type: "rename" })
export class RenameAction implements IActionType {
    constructor(
        private readonly client: DiscordClientService
    ) {}

    async execute({payload, descriptor}:  ActionExecuteOptions) {
        const channel = await this.client.channels.fetch(descriptor.channelId);
        if (channel.type == ChannelType.DM || channel.type == ChannelType.GroupDM) return;

        const { name } = descriptor.data as { name: string };
        await channel.setName(name);
    }
}
