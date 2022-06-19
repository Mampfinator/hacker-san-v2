import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { YouTubeConfig } from "./modules/config/config";
import { YouTubeService } from "./modules/youtube/youtube.service";

@Injectable()
export class AppService implements OnApplicationBootstrap {
    constructor(
        private readonly config: ConfigService,
        private readonly youtube: YouTubeService,
    ) {}

    async onApplicationBootstrap() {
        if (this.config.get<YouTubeConfig>("YOUTUBE").active)
            await this.youtube.init();
    }
}
