import { ChannelType } from "discord.js";
import { Action, ActionPayload, IActionType } from "../action";

@Action({type: "rename"})
export class RenameAction implements IActionType {
    async execute({ data, channel }: ActionPayload) {
        if (channel.type == ChannelType.DM || channel.type == ChannelType.GroupDM) return;

        const { name } = data as { name: string };
        await channel.setName(name);
    }
}
