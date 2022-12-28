import { CommandBus, CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { EnsureChannelResult } from "../../../modules/platforms/commands/ensure-channel.handler";
import { Repository } from "typeorm";
import { SyncPostsCommand } from "../community-posts/commands/sync-posts.command";
import { YouTubeChannel } from "../model/youtube-channel.entity";
import { SyncVideosCommand } from "../videos/commands/sync-videos.command";
import { YouTubeEventSubService } from "../videos/youtube-eventsub.service";
import { YouTubeApiService } from "../youtube-api.service";
import { EnsureYouTubeChannelCommand } from "./ensure-youtube-channel.command";

const channelIdRegex = /^UC[A-z0-9\-_]{22}$/;

@CommandHandler(EnsureYouTubeChannelCommand)
export class EnsureYouTubeChannelHandler
    implements ICommandHandler<EnsureYouTubeChannelCommand>
{
    constructor(
        @InjectRepository(YouTubeChannel)
        private readonly channelRepo: Repository<YouTubeChannel>,
        private readonly eventSub: YouTubeEventSubService,
        private readonly api: YouTubeApiService,
        private readonly commandBus: CommandBus,
    ) {}

    async execute({
        channelId: rawChannelId,
    }: EnsureYouTubeChannelCommand): Promise<EnsureChannelResult> {
        try {
            const channelId = rawChannelId.trim().match(channelIdRegex)?.[0];
            if (!channelId)
                return {
                    success: false,
                    error: new Error("Invalid channel ID format."),
                };

            const exists = await this.channelRepo.findOne({
                where: { channelId },
            });

            if (!exists) {
                const { data: channels } = await this.api.channels.list({
                    id: [channelId],
                    part: ["snippet"],
                });
                const [channel] = channels.items;
                if (!channel)
                    return {
                        success: false,
                        error: new Error("Channel not found."),
                    };

                await this.channelRepo.save({
                    channelId,
                    channelName: channel.snippet.title, // in case we ever need it
                });

                await this.eventSub.subscribe(channelId);
                await this.commandBus.execute(
                    new SyncPostsCommand({ channelId }),
                );
                await this.commandBus.execute(new SyncVideosCommand(channelId));

                return {
                    success: true,
                    channelId,
                    name: channel.snippet.title,
                };
            }

            return { success: true, channelId, name: exists.channelName };
        } catch (error) {
            return { error, success: false };
        }
    }
}
