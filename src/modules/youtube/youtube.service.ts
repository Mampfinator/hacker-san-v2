import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { YouTubeChannel } from "./model/youtube-channel.entity";
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
    ) {}

    public async init() {
        this.logger.log(`Initializing...`);

        const channels = await this.channels.find();
        for (const { channelId } of channels) {
            await this.eventSub.subscribe(channelId);
        }
    }
}
