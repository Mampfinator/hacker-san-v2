import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { youtube_v3 } from "googleapis";
import { YouTubeConfig } from "../config/config";

@Injectable()
export class YouTubeApiService extends youtube_v3.Youtube {
    constructor(private readonly config: ConfigService) {
        const { apiKey } = config.getOrThrow<YouTubeConfig>("YOUTUBE");

        super({
            auth: apiKey,
        });
    }
}
