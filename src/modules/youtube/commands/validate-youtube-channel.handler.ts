import {
    CommandBus,
    CommandHandler,
    IInferredCommandHandler,
} from "@nestjs/cqrs";
import { ValidateChannelResult } from "../../platforms/commands/ensure-channel.handler";
import { SyncPostsCommand } from "../community-posts/commands/sync-posts.command";
import { SyncVideosCommand } from "../videos/commands/sync-videos.command";
import { YouTubeEventSubService } from "../videos/youtube-eventsub.service";
import { YouTubeApiService } from "../youtube-api.service";
import { ValidateYouTubeChannelCommand } from "./validate-youtube-channel.command";
import { ChannelEntity } from "../../platforms/models/channel.entity";

const channelIdRegex = /^UC[A-z0-9\-_]{22}$/;

@CommandHandler(ValidateYouTubeChannelCommand)
export class ValidateYouTubeChannelHandler
    implements IInferredCommandHandler<ValidateYouTubeChannelCommand>
{
    constructor(
        private readonly eventSub: YouTubeEventSubService,
        private readonly api: YouTubeApiService,
        private readonly commandBus: CommandBus,
    ) {}

    async execute({
        channelId: rawChannelId,
    }: ValidateYouTubeChannelCommand): Promise<ValidateChannelResult> {
        const channelId = rawChannelId.trim().match(channelIdRegex)?.[0];

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

        await this.eventSub.subscribe(channelId);
        await this.commandBus.execute(new SyncPostsCommand({ channelId }));
        await this.commandBus.execute(new SyncVideosCommand(channelId));

        const {
            id: platformId,
            snippet: {
                title: name,
                thumbnails: {
                    high: { url: avatarUrl },
                },
            },
        } = channel;

        const channelEntity: Omit<ChannelEntity, "id"> = {
            platform: "youtube",
            platformId,
            name,
            avatarUrl,
        };

        return {
            success: true,
            channel: channelEntity,
        };
    }
}
