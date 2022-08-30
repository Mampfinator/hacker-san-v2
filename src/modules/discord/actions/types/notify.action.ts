import { ChannelType, EmbedBuilder } from "discord.js";
import { ActionPayload, ActionType, IActionType } from "../action";
import { ActionUtil } from "../util";

@ActionType("notify")
export class NotifyAction implements IActionType {
    async execute({ data, command, channel }: ActionPayload) {
        if (channel.type !== ChannelType.GuildText) return;
        
        const { message } = data as { message: string };

        const notification: { content: string; embeds?: EmbedBuilder[] } = {
            content: ActionUtil.interpolate(message, command),
        };
        if (command.options.embed)
            notification.embeds = [command.options.embed];
        await channel.send(notification);
    }
}
