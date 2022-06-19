import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { EnsureChannelResult } from "src/modules/shared/commands/ensure-channel.handler";
import { Repository } from "typeorm";
import { YouTubeChannel } from "../model/youtube-channel.entity";
import { EnsureYouTubeChannelCommand } from "./ensure-youtube-channel.command";

@CommandHandler(EnsureYouTubeChannelCommand)
export class EnsureYouTubeChannelHandler
    implements ICommandHandler<EnsureYouTubeChannelCommand>
{
    constructor(
        @InjectRepository(YouTubeChannel)
        private readonly channelRepo: Repository<YouTubeChannel>,
    ) {}

    async execute({
        channelId,
    }: EnsureYouTubeChannelCommand): Promise<EnsureChannelResult> {
        try {
            const exists = await this.channelRepo.findOne({
                where: { channelId },
            });

            // TODO: ID validation here.
            if (!exists) {
                await this.channelRepo.save({
                    channelId,
                });
            }

            return { success: true };
        } catch (error) {
            return { error, success: false };
        }
    }
}
