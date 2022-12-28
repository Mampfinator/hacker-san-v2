import { ChannelType } from "discord.js";
import { ActionPayload, Action, IActionType } from "../action";

@Action({type: "lock"})
export class LockAction implements IActionType {
    private readonly emojis = {
        lock: "🔒",
        unlock: "🔓",
    };

    async execute({ channel, action }: ActionPayload) {
        if (channel.type !== ChannelType.GuildText) return;

        const { mode, message } = action.data as {
            mode: "lock" | "unlock";
            message?: string;
        };
        const permission = mode === "lock" ? false : null;
        if (mode === "lock" && message)
            await channel.send(this.makeMessage(mode, message));
        await channel.permissionOverwrites.create(channel.guildId, {
            SendMessages: permission,
        });

        if (mode === "unlock" && message)
            await channel.send(this.makeMessage(mode, message));
    }

    private makeMessage(mode: "lock" | "unlock", message: string) {
        return `${this.emojis[mode]} ${message}`;
    }
}
