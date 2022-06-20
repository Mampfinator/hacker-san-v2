import { Injectable, Logger } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { YouTubeChannel } from "./model/youtube-channel.entity";
import { SyncVideosCommand } from "./videos/commands/sync-videos.command";
import { YouTubeEventSubService } from "./videos/youtube-eventsub.service";
import { YouTubeVideosService } from "./videos/youtube-video.service";

@Injectable()
export class YouTubeService {
    private readonly logger = new Logger(YouTubeService.name);

    constructor(
        private readonly eventSub: YouTubeEventSubService,
        private readonly videos: YouTubeVideosService,
        @InjectRepository(YouTubeChannel)
        private readonly channels: Repository<YouTubeChannel>,
        private readonly commandBus: CommandBus
    ) {}

    public async init() {
        this.logger.log(`Initializing...`);

        const channels = await this.channels.find();
        for (const { channelId } of channels) {
            await this.eventSub.subscribe(channelId);
            await this.commandBus.execute(new SyncVideosCommand(channelId)).then(() => {
                this.logger.debug(`Synced videos for ${channelId}.`);
            });
        }
    }
}
