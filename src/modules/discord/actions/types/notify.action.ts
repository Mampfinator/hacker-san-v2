import { Injectable } from "@nestjs/common";
import { MessageEmbed } from "discord.js";
import { ActionType, IActionType } from "../action";
import { ActionUtil } from "../util";

//@Injectable()
@ActionType("notify")
export class NotifyAction implements IActionType {
    async execute({ data, command, channel }) {
        const { message } = data as { message: string };

        const notification: { content: string; embeds?: MessageEmbed[] } = {
            content: ActionUtil.interpolate(message, command),
        };
        if (command.options.embed)
            notification.embeds = [command.options.embed];
        await channel.send(notification);
    }
}
