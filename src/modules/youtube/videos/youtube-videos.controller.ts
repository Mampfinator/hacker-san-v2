import {
    BadRequestException,
    Controller,
    ForbiddenException,
    Get,
    Headers,
    HttpException,
    Logger,
    Post,
    Query,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { YouTubeConfig } from "src/modules/config/config";
import { RawBody } from "src/shared/decorators/raw-body.decorator";
import { XML } from "src/shared/decorators/xml.decorator";
import { YouTubeLiveStatus } from "../model/youtube-video.entity";
import { YouTubeEventSubService } from "./youtube-eventsub.service";
import { YouTubeVideosService } from "./youtube-video.service";

type YouTubeEventSubMessage = {
    feed: {
        link: string[];
        title: string;
        updated: string;
        entry: {
            id: string;
            "yt:videoId": string;
            "yt:channelId": string;
            title: string;
            link: string;
            author: {
                name: string;
                uri: string;
            };
            published: string;
            updated: string;
        };
    };
};

@Controller({ path: "youtube" })
export class YouTubeVideosController {
    private readonly logger = new Logger(YouTubeVideosController.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly eventSub: YouTubeEventSubService,
        private readonly videos: YouTubeVideosService,
    ) {}

    @Get("eventsub")
    returnChallenge(
        @Query("hub.topic") topic: string,
        @Query("hub.mode") mode: "denied" | "subscribe" | "unsubscribe",
        @Query("hub.challenge") challenge?: string,
        @Query("hub.lease_seconds") lease?: string,
    ) {
        if (!topic || !mode || !challenge) throw new BadRequestException();
        const [, channelId] = topic.split("=");
        this.logger.log(
            `Got challenge request for ${channelId}. Scheduling lease renewal in ${lease}.`,
        );
        this.eventSub.scheduleLeaseRenewal(channelId, Number(lease));

        return challenge;
    }

    @Post("eventsub")
    async handleNewPost(
        @XML() xmlBody: YouTubeEventSubMessage,
        @RawBody() rawBody,
        @Headers("x-hub-signature") hubSignature: string,
        @Headers("link") link: string,
        @Query("hub.topic") topic: string,
    ) {
        this.logger.debug(
            `Got YouTube EventSub POST: ${hubSignature} for ${topic}.`,
        );
        if (!link) throw new BadRequestException();

        const { secret } =
            this.configService.getOrThrow<YouTubeConfig>("YOUTUBE");
        if (secret && !hubSignature) {
            this.logger.log(`Expected hub signature, got none.`);
            throw new ForbiddenException();
        }

        if (secret) {
            const [algo, signature] = hubSignature.split("=");
            const hmac = createHmac(algo, secret);
            let computedSignature: string;

            try {
                computedSignature = hmac
                    .update(Buffer.from(rawBody, "utf-8"))
                    .digest("hex");
            } catch {
                throw new ForbiddenException();
            }

            if (computedSignature !== signature)
                throw new HttpException("Invalid signature", 204); // as per PubSubHubbub spec
        }

        const videoId = xmlBody.feed?.entry?.["yt:videoId"];
        if (!videoId) {
            return this.logger.log(
                `No videoId provided: ${xmlBody.feed.entry}`,
            );
        }

        const { inserted, video } = await this.videos.process(videoId);

        if (inserted) {
            const status = this.videos.getStatus(video);
            this.logger.debug(
                `Got notification for new YouTube video: ${videoId} (inserted? ${inserted}, status: ${status})`,
            );
            this.videos.generateNotif(
                video,
                status == YouTubeLiveStatus.Offline ? "upload" : status,
            );
        }
    }
}
