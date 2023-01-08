import { ChannelType } from "discord.js";
import { DiscordClientService } from "../../client/discord-client.service";
import { interpolate } from "../action.util";
import { ActionExecuteOptions, Action, IActionType } from "../decorators/action";

@Action({ type: "lock" })
export class LockAction implements IActionType {
    private readonly emojis = {
        lock: "🔒",
        unlock: "🔓",
    };

    constructor(
        private readonly client: DiscordClientService
    ) {}

    async execute({ descriptor, payload }: ActionExecuteOptions) {
        const channel = await this.client.channels.fetch(descriptor.channelId);
        
        if (channel.type !== ChannelType.GuildText) return;

        const { mode, message: rawMessage } = descriptor.data as {
            mode: "lock" | "unlock";
            message?: string;
        };

        const message = interpolate(rawMessage, {descriptor, payload});

        const permission = mode === "lock" ? false : null;
        if (mode === "lock" && message) await channel.send(this.makeMessage(mode, message));
        await channel.permissionOverwrites.create(channel.guildId, {
            SendMessages: permission,
        });

        if (mode === "unlock" && message) await channel.send(this.makeMessage(mode, message));
    }

    private makeMessage(mode: "lock" | "unlock", message: string) {
        return `${this.emojis[mode]} ${message}`;
    }
}
