import { ChannelType } from "discord.js";
import { ActionPayload, Action, IActionType } from "../action";
import { ActionUtil } from "../util";

@Action({ type: "echo" })
export class EchoAction implements IActionType {
    async execute({ action, channel, command }: ActionPayload) {
        const { message } = action.data as { message: string };

        if (channel.type === ChannelType.GuildText) {
            await channel.send(ActionUtil.interpolate(message, command));
        }
    }
}
