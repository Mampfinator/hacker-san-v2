import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, EventBus, QueryBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import { youtube_v3 } from "googleapis";
import { In } from "typeorm";
import { Event, PropertiesOnly } from "../../../constants";
import { VideoEvent } from "../../platforms/events/platform-event";
import { ChannelEntity } from "../../platforms/models/channel.entity";
import { StreamEntity, StreamStatus } from "../../platforms/models/stream.entity";
import { FindChannelQuery, UpdateChannelQuery } from "../../platforms/queries";
import { FindStreamQuery } from "../../platforms/queries/stream";
import { UpsertStreamQuery } from "../../platforms/queries/stream/upsert-stream.query";
import { getStatusChangeEvent } from "../../platforms/util";
import { YouTubeApiService } from "../youtube-api.service";
import { YouTubeFeedService } from "./feed/youtube-feed.service";

@Injectable()
export class YouTubeVideosService {
    private readonly logger = new Logger(YouTubeVideosService.name);

    private readonly channelList: string[] = [];
    private idsToCheck: string[] = [];

    private readonly channelScanInterval: number;

    constructor(
        private readonly apiClient: YouTubeApiService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly feedService: YouTubeFeedService,
        config: ConfigService,
    ) {
        this.channelScanInterval = config.get<number>("YOUTUBE.channelScanInterval") ?? 5000;
    }

    @OnEvent("listeners.ready")
    scheduleRescans() {
        const interval = setInterval(() => this.rescanVideos(), this.channelScanInterval);
    }

    /**
     * Scan the feed for new videos and queue them up for the batcher to process.
     */
    private async rescanVideos() {
        if (this.channelList.length === 0) {
            const channels = await this.queryBus.execute(new FindChannelQuery().forPlatform("youtube"));
            this.channelList.push(...channels.map(channel => channel.id));
        }

        const channelId = this.channelList.shift();
        if (!channelId) return; // early abort; we don't have any YouTube channels to monitor.

        const feed = await this.feedService.fetch(channelId);

        await this.queryBus.execute(
            new UpdateChannelQuery({ platform: "youtube", platformId: channelId }, { name: feed.name }),
        ); // cache display name

        const videoIds = feed.entries.map(entry => entry.id);

        const knownVideos = new Set(
            (
                await this.queryBus.execute(
                    new FindStreamQuery({ one: false }).forPlatform("youtube").forId(In(videoIds)),
                )
            ).map(video => video.platformId),
        );

        // let the batcher handle the rest.
        this.checkVideo(...videoIds.filter(id => !knownVideos.has(id)));
    }

    public async batchFetchVideos(...ids: string[]): Promise<Omit<StreamEntity, "id">[]> {
        const videos: Omit<StreamEntity, "id">[] = [];

        for (let i = 0; i < ids.length; i += 50) {
            const batch = ids.slice(i, i + 50);

            const {
                data: { items: apiVideos },
            } = await this.apiClient.videos.list({
                id: batch,
                part: ["snippet", "liveStreamingDetails"],
            });

            videos.push(...apiVideos.map(video => this.apiToEntity(video)));
        }

        return videos;
    }

    @Interval(20000)
    async checkVideos() {
        const videoMap = new Map<string, { api?: Omit<StreamEntity, "id">; cached?: StreamEntity }>();

        const idsToCheck = [...this.idsToCheck];

        for (const video of await this.queryBus.execute(
            new FindStreamQuery({ one: false })
                .where({
                    platform: "youtube",
                    status: In([StreamStatus.Live, StreamStatus.Upcoming]),
                })
                .where({
                    platformId: In(idsToCheck),
                }),
        )) {
            videoMap.set(video.platformId, { cached: video });
        }

        this.idsToCheck = []; // reset for next batching

        for (const video of await this.batchFetchVideos(...videoMap.keys(), ...idsToCheck)) {
            if (videoMap.has(video.platformId)) videoMap.get(video.platformId).api = video;
            else videoMap.set(video.platformId, { api: video });
        }

        const events = new Map<string, Event>();
        const channelIds = new Set<string>();

        for (const [id, { cached, api }] of videoMap) {
            const event = getStatusChangeEvent(cached?.status, api?.status);
            if (typeof event == "undefined") continue;
            if (event == "invalid") {
                this.logger.warn(
                    `Found invalid status change for video with ID ${id}: ${cached?.status} => ${api?.status}`,
                );
                continue;
            }

            events.set(id, event);
            channelIds.add(api?.channelId ?? cached?.channelId);
        }

        const channels = new Map<string, ChannelEntity>(
            (await this.queryBus.execute(new FindChannelQuery({ one: false }).forId(In([...channelIds])))).map(
                entity => [entity.platformId, entity],
            ),
        );

        await this.queryBus.execute(new UpsertStreamQuery([...videoMap.values()].map(v => v.api).filter(v => v)));

        this.eventBus.publishAll(
            (
                await this.queryBus.execute(
                    new FindStreamQuery({ one: false }).forPlatform("youtube").forId(In([...events.keys()])),
                )
            ).map(
                video =>
                    new VideoEvent({
                        video,
                        event: events.get(video.platformId),
                        channel: channels.get(video.channelId),
                    }),
            ),
        );
    }

    /**
     *
     * @param id
     */
    public checkVideo(...ids: string[]) {
        this.idsToCheck.push(...ids);
    }

    public apiToEntity(video: youtube_v3.Schema$Video): PropertiesOnly<Omit<StreamEntity, "id">> {
        const {
            id: platformId,
            snippet: { channelId, title, liveBroadcastContent },
        } = video;

        return {
            platform: "youtube",
            platformId,
            channelId,
            title,
            status: this.liveBroadcastContentToStreamStatus(liveBroadcastContent as any),
        };
    }

    private liveBroadcastContentToStreamStatus(liveBroadcastContent: "live" | "none" | "upcoming"): StreamStatus {
        return liveBroadcastContent == "none" ? StreamStatus.Offline : (liveBroadcastContent as StreamStatus);
    }
}
