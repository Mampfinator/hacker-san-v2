import { ICommand } from "@nestjs/cqrs";
import { IEnsureChannelCommand } from "src/modules/shared/commands/ensure-channel.handler";

export class EnsureYouTubeChannelCommand
    implements ICommand, IEnsureChannelCommand
{
    constructor(public readonly channelId: string) {}
}
