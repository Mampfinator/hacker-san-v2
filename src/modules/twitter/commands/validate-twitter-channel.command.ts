import { IValidateChannelCommand } from "../../platforms/commands/ensure-channel.handler";

export class ValidateTwitterChannelCommand implements IValidateChannelCommand {
    constructor(public readonly channelId: string) {}
}
