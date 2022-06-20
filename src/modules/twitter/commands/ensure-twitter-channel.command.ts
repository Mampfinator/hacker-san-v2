import { IEnsureChannelCommand } from "src/modules/platforms/commands/ensure-channel.handler";

export class EnsureTwitterChannelCommand implements IEnsureChannelCommand {
    constructor(public readonly channelId: string) {}
}
