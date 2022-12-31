import { ICommand } from "@nestjs/cqrs";
import { Command } from "@nestjs-architects/typed-cqrs";
import { Platform } from "../../../constants";
import { IValidateChannelCommand, ValidateChannelResult } from "./ensure-channel.handler";

export class EnsureChannelCommand extends Command<ValidateChannelResult> implements ICommand, IValidateChannelCommand {
    constructor(public readonly channelId: string, public readonly platform: Platform) {
        super();
    }
}
