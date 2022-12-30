import { ICommand } from "@nestjs/cqrs";
import { IEnsureChannelCommand } from "../../../modules/platforms/commands/ensure-channel.handler";

export class EnsureYouTubeChannelCommand implements ICommand, IEnsureChannelCommand {
    constructor(public readonly channelId: string) {}
}
