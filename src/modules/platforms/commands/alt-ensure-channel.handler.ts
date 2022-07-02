// WIP.
// Slated to replace the old EnsureChannelHandler.

import {
    CommandBus,
    CommandHandler,
    ICommand,
    ICommandHandler,
} from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Class, Platform } from "src/constants";
import { ValidateTwitterChannelCommand } from "src/modules/twitter/commands/validate-twitter-channel.command";
import { ValidateYouTubeChannelCommand } from "src/modules/youtube/commands/validate-youtube-channel.command";
import { Repository } from "typeorm";
import { ChannelEntity } from "../models/channel.entity";
import { EnsureChannelCommand } from "./ensure-channel.command";

export interface EnsureChannelResult {
    success: boolean;
    channel?: ChannelEntity;
    error?: Error;
}

export interface ValidateChannelResult {
    success: boolean;
    error?: Error;
    channel?: ChannelEntity;
}

export interface IValidateChannelCommand extends ICommand {
    readonly channelId: string;
}

const validators: { [Property in Platform]: Class<IValidateChannelCommand> } = {
    youtube: ValidateYouTubeChannelCommand,
    twitter: ValidateTwitterChannelCommand,
};

@CommandHandler(EnsureChannelCommand)
export class AltEnsureChannelHander
    implements ICommandHandler<EnsureChannelCommand>
{
    constructor(
        @InjectRepository(ChannelEntity)
        private readonly channelRepo: Repository<ChannelEntity>,
        private readonly commandBus: CommandBus,
    ) {}

    async execute({
        channelId,
        platform,
    }: EnsureChannelCommand): Promise<EnsureChannelResult> {
        const existingChannel = await this.channelRepo.findOne({
            where: { id: channelId },
        });

        if (existingChannel) return { success: true, channel: existingChannel };

        const { success, error, channel } = await this.commandBus.execute<
            IValidateChannelCommand,
            ValidateChannelResult
        >(new validators[platform](channelId));

        if (!success) return { success: false, error };
        this.channelRepo.save(channel);

        return { success: true, channel };
    }
}
