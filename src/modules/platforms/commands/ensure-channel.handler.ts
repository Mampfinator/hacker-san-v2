import { Logger } from "@nestjs/common";
import { CommandBus, CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Class, Platform } from "../../../constants";
import { EnsureTwitterChannelCommand } from "../../../modules/twitter/commands/ensure-twitter-channel.command";
import { EnsureYouTubeChannelCommand } from "../../../modules/youtube/commands/ensure-youtube-channel.command";
import { EnsureChannelCommand } from "./ensure-channel.command";

export interface IEnsureChannelCommand {
    channelId: string;
}

const platformHandlers: {
    [Property in Platform]: Class<IEnsureChannelCommand>;
} = {
    youtube: EnsureYouTubeChannelCommand,
    twitter: EnsureTwitterChannelCommand,
};

export interface EnsureChannelResult {
    success: boolean;
    error?: any;
    channelId?: string;
    name?: string;
}

@CommandHandler(EnsureChannelCommand)
export class EnsureChannelHandler implements ICommandHandler<EnsureChannelCommand> {
    private readonly logger = new Logger(EnsureChannelHandler.name);
    constructor(private readonly commandBus: CommandBus) {}

    async execute({ platform, channelId }: EnsureChannelCommand): Promise<EnsureChannelResult> {
        //let newCommand: IEnsureChannelCommand;

        const newCommand = new platformHandlers[platform](channelId);

        const result = await this.commandBus.execute<IEnsureChannelCommand, EnsureChannelResult>(newCommand);

        this.logger.debug(`Success: ${result.success} ${result.error ? `; Error: ${result.error}` : ""}`);

        return result;
    }
}
