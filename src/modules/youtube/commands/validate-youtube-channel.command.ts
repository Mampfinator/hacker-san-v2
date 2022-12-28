import { IValidateChannelCommand } from "../../../modules/platforms/commands/alt-ensure-channel.handler";

export class ValidateYouTubeChannelCommand implements IValidateChannelCommand {
    constructor(public readonly channelId: string) {}
}
