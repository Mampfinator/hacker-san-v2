import { IEnsureChannelCommand } from "src/modules/shared/commands/ensure-channel.handler";

export class EnsureTwitterChannelCommand implements IEnsureChannelCommand {
    constructor(public readonly channelId: string) {}
}
