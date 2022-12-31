import { Command } from "@nestjs-architects/typed-cqrs";
import { IValidateChannelCommand, ValidateChannelResult } from "../../platforms/commands/ensure-channel.handler";

export class ValidateYouTubeChannelCommand extends Command<ValidateChannelResult> implements IValidateChannelCommand {
    constructor(public readonly channelId: string) {
        super();
    }
}
