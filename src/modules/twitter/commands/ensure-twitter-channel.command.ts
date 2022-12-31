import { Command } from "@nestjs-architects/typed-cqrs";
import {
    IValidateChannelCommand,
    ValidateChannelResult,
} from "../../../modules/platforms/commands/ensure-channel.handler";

export class EnsureTwitterChannelCommand
    extends Command<ValidateChannelResult>
    implements IValidateChannelCommand
{
    public readonly channelId: string;

    constructor(channelId: string) {
        super();
        this.channelId = channelId.trim();
    }
}
