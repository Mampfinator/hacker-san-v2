import { Logger } from "@nestjs/common";
import { CommandBus, CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { EnsureTwitterChannelCommand } from "src/modules/twitter/commands/ensure-twitter-channel.command";
import { EnsureYouTubeChannelCommand } from "src/modules/youtube/commands/ensure-youtube-channel.command";
import { EnsureChannelCommand } from "./ensure-channel.command";

export interface IEnsureChannelCommand {
    channelId: string;
}

export interface EnsureChannelResult {
    success: boolean;
    error?: any;
    channelId?: string;
}

@CommandHandler(EnsureChannelCommand)
/**
 *
 */
export class EnsureChannelHandler
    implements ICommandHandler<EnsureChannelCommand>
{
    private readonly logger = new Logger(EnsureChannelHandler.name);
    constructor(private readonly commandBus: CommandBus) {}

    async execute({
        platform,
        channelId,
    }: EnsureChannelCommand): Promise<EnsureChannelResult> {
        let newCommand: IEnsureChannelCommand;

        switch (platform) {
            case "twitter":
                newCommand = new EnsureTwitterChannelCommand(channelId);
                break;
            case "youtube":
                newCommand = new EnsureYouTubeChannelCommand(channelId);
                break;
            default:
                throw new Error(`Unrecognized platform: ${platform}`);
        }

        const result = await this.commandBus.execute<
            IEnsureChannelCommand,
            EnsureChannelResult
        >(newCommand);
        this.logger.debug(
            `Success: ${result.success} ${
                result.error ? `; Error: ${result.error}` : ""
            }`,
        );
        return result;
    }
}
