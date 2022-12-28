import { ICommand } from "@nestjs/cqrs";
import { Platform } from "../../../constants";
import { IEnsureChannelCommand } from "./ensure-channel.handler";

export class EnsureChannelCommand implements ICommand, IEnsureChannelCommand {
    constructor(
        public readonly channelId: string,
        public readonly platform: Platform,
    ) {}
}
