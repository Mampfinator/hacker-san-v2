import { ChannelType, EmbedBuilder } from "discord.js";
import { Action, ActionPayload, IActionType } from "../action";
import { ActionUtil } from "../util";

@Action({ type: "notify" })
export class NotifyAction implements IActionType {
    async execute({ action, command, channel }: ActionPayload) {
        if (channel.type !== ChannelType.GuildText) return;

        const { message } = action.data as { message: string };

        const notification: { content: string; embeds?: EmbedBuilder[] } = {
            content: ActionUtil.interpolate(message, command),
        };
        if (command.options.embed) notification.embeds = [command.options.embed];
        await channel.send(notification);
    }
}
