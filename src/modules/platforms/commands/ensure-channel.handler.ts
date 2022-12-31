import { CommandBus, CommandHandler, ICommand, IInferredCommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Class, Platform } from "../../../constants";
import { ValidateTwitterChannelCommand } from "../../twitter/commands/validate-twitter-channel.command";
import { ValidateYouTubeChannelCommand } from "../../youtube/commands/validate-youtube-channel.command";
import { Repository } from "typeorm";
import { ChannelEntity } from "../models/channel.entity";
import { EnsureChannelCommand } from "./ensure-channel.command";

export interface ValidateChannelResult {
    success: boolean;
    error?: Error;
    channel?: Omit<ChannelEntity, "id">;
}

export interface IValidateChannelCommand extends ICommand {
    readonly channelId: string;
}

const validators: { [Property in Platform]: Class<IValidateChannelCommand> } = {
    youtube: ValidateYouTubeChannelCommand,
    twitter: ValidateTwitterChannelCommand,
};

@CommandHandler(EnsureChannelCommand)
export class EnsureChannelHander implements IInferredCommandHandler<EnsureChannelCommand> {
    constructor(
        @InjectRepository(ChannelEntity)
        private readonly channelRepo: Repository<ChannelEntity>,
        private readonly commandBus: CommandBus,
    ) {}

    async execute({ channelId, platform }: EnsureChannelCommand): Promise<ValidateChannelResult> {
        const existingChannel = await this.channelRepo.findOne({
            where: { platformId: channelId },
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
