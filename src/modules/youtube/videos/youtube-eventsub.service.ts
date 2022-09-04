import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { YouTubeConfig } from "src/modules/config/config";
import {
    YOUTUBE_EVENTSUB_HUB_URL,
    YOUTUBE_EVENTSUB_TOPIC_BASE,
} from "./constants";

@Injectable()
export class YouTubeEventSubService {
    private readonly futureLeases = new Map<string, NodeJS.Timeout>();
    private readonly logger = new Logger(YouTubeEventSubService.name);

    constructor(private readonly configService: ConfigService) {}

    public async subscribe(channelId: string) {
        this.logger.debug(
            `Subscribing to push notifications for YouTube channel ${channelId}`,
        );
        if (this.futureLeases.has(channelId)) {
            const oldLease = this.futureLeases.get(channelId);
            clearTimeout(oldLease);
        }
        return await this._doSubscribe("subscribe", channelId);
    }

    public async unsubscribe(channelId: string) {
        if (this.futureLeases.has(channelId)) {
            clearTimeout(this.futureLeases.get(channelId));
            this.futureLeases.delete(channelId);
        }

        return await this._doSubscribe("unsubscribe", channelId);
    }

    private async _doSubscribe(
        mode: "subscribe" | "unsubscribe",
        channelId: string,
    ) {
        const topic = `${YOUTUBE_EVENTSUB_TOPIC_BASE}?channel_id=${channelId}`;
        const callbackUrl = `${this.configService.getOrThrow(
            "URL",
        )}/youtube/eventsub`;
        const { secret } =
            this.configService.getOrThrow<YouTubeConfig>("YOUTUBE");

        return axios({
            method: "POST",
            baseURL: YOUTUBE_EVENTSUB_HUB_URL,
            params: {
                "hub.mode": mode,
                "hub.topic": topic,
                "hub.verify": "async",
                "hub.secret": secret,
                "hub.callback": callbackUrl,
            },
        });
    }

    public scheduleLeaseRenewal(channelId: string, leaseSeconds: number) {
        this.logger.debug(
            `Scheduling lease renewal for YouTube channel ${channelId}`,
        );

        if (this.futureLeases.has(channelId)) {
            this.logger.debug(
                `Skipping lease renewal for ${channelId}: lease renewal already scheduled.`,
            );
            return false;
        }

        this.futureLeases.set(
            channelId,
            setTimeout(() => {
                this.subscribe(channelId);
            }, (leaseSeconds - 5) * 1000),
        );
    }
}
