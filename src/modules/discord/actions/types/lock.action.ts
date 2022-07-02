import { ActionType, IActionType } from "../action";

@ActionType("lock")
export class LockAction implements IActionType {
    private readonly emojis = {
        lock: "🔒",
        unlock: "🔓",
    };

    async execute({ channel, data }) {
        const { mode, message } = data as {
            mode: "lock" | "unlock";
            message?: string;
        };
        const permission = mode === "lock" ? false : null;
        if (mode === "lock" && message)
            await channel.send(this.makeMessage(mode, message));
        await channel.permissionOverwrites.create(channel.guildId, {
            SEND_MESSAGES: permission,
        });

        if (mode === "unlock" && message)
            await channel.send(this.makeMessage(mode, message));
    }

    private makeMessage(mode: "lock" | "unlock", message: string) {
        return `${this.emojis[mode]} ${message}`;
    }
}
