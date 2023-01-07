import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { youtube_v3 } from "googleapis";
import { TriggerActionsCommand } from "../../../modules/discord/commands/trigger-actions.command";
import { ChannelEntity } from "../../../modules/platforms/models/channel.entity";
import { FindChannelQuery } from "../../../modules/platforms/queries";
import { Util } from "../../../util";
import { In, Repository } from "typeorm";
import { YouTubeLiveStatus, YouTubeVideo } from "../model/youtube-video.entity";
import { YouTubeApiService } from "../youtube-api.service";
import { YOUTUBE_VIDEO_FEED_URL } from "./constants";

interface SimplifiedYouTubeVideo {
    id: string;
    liveStatus: YouTubeLiveStatus | "Unknown"; // for privated, deleted, etc videos

    title: string;
    description: string;

    channelId: string;

    scheduledStart?: Date;
    liveAt?: Date;
    endedAt?: Date;
    scheduledEnd?: Date;
}

type YouTubeStatusChange = "live" | "upcoming" | "upload" | "offline";

@Injectable()
export class YouTubeVideosService {
    private readonly logger = new Logger(YouTubeVideosService.name);
    private readonly rssParser = new XMLParser();
    /**
     * Used to store the list of channels that are still to be scanned.
     * If the list is empty, rebuild it from the database.
     */
    private channelList: string[] = [];
    private newVideoIds: string[] = [];

    private readonly channelScanInterval: number;

    constructor(
        private readonly apiClient: YouTubeApiService,
        private readonly commandBus: CommandBus,
        @InjectRepository(YouTubeVideo)
        private readonly videoRepo: Repository<YouTubeVideo>,
        private readonly queryBus: QueryBus,
        private readonly schedulerRegistry: SchedulerRegistry,
        config: ConfigService,
    ) {
        this.channelScanInterval = config.get<number>("YOUTUBE.channelScanInterval");
    }

    @OnEvent("listeners.ready")
    private scheduleRescans() {
        const interval = setInterval(() => this.rescanVideos(), this.channelScanInterval);
        this.schedulerRegistry.addInterval("CHECK_CHANNEL_VIDEOS", interval);
    }

    /**
     * Processes potentially new videos.
     * If a video is not new, returns false.
     * If a video is new, does some API & database magic and returns true.
     */
    public async process(video: string | youtube_v3.Schema$Video): Promise<{
        inserted: boolean;
        unavailable?: boolean;
        video?: youtube_v3.Schema$Video;
    }> {
        const videoId = typeof video === "string" ? video : video.id;
        const knownVideo = await this.videoRepo.findOne({
            where: { id: videoId },
        });
        if (knownVideo) return { inserted: false };

        const apiVideo: youtube_v3.Schema$Video =
            typeof video === "string"
                ? (
                      await this.apiClient.videos.list({
                          id: [video],
                          part: ["snippet", "liveStreamingDetails"],
                      })
                  ).data.items?.[0]
                : video;
        if (!video) return { inserted: false, unavailable: true };

        if (!apiVideo) {
            this.logger.warn("Somehow could not find a video in the API...?");
        }

        const status = this.getStatus(apiVideo);
        if (!status) return;

        await this.videoRepo.insert({
            id: apiVideo.id,
            status,
            channelId: apiVideo.snippet.channelId,
        });

        return { inserted: true, video: apiVideo };
    }

    public getStatus(video: youtube_v3.Schema$Video): YouTubeLiveStatus {
        const { liveBroadcastContent } = video.snippet;

        let status: YouTubeLiveStatus;
        switch (liveBroadcastContent) {
            case "none":
                status = YouTubeLiveStatus.Offline;
                break;
            case "live":
                status = YouTubeLiveStatus.Live;
                break;
            case "upcoming":
                status = YouTubeLiveStatus.Upcoming;
                break;
            default:
                this.logger.warn(`Could not discern live status for ${video.id}. Status: ${liveBroadcastContent}`);
                return;
        }

        return status;
    }

    // TODO: put on dynamic interval.
    @Interval(12500)
    public async checkVideoStatusChange() {
        const dbVideos = await this.videoRepo.find({
            where: {
                status: In([YouTubeLiveStatus.Live, YouTubeLiveStatus.Upcoming]),
            },
        });

        if (dbVideos.length === 0) return;

        const apiVideos = (
            await this.apiClient.videos.list({
                id: dbVideos.map(video => video.id),
                part: ["snippet", "liveStreamingDetails"],
            })
        ).data.items;

        const videos: Map<string, { db?: YouTubeVideo; api?: youtube_v3.Schema$Video }> = new Map();

        for (const video of dbVideos) {
            if (!videos.has(video.id)) videos.set(video.id, { db: video });
        }

        for (const video of apiVideos) {
            if (!videos.has(video.id)) videos.set(video.id, { api: video });
            else videos.get(video.id).api = video;
        }

        for (const [id, { db: dbVideo, api }] of videos) {
            const apiVideo = this.simplifyVideo(api, id);

            let newStatus: YouTubeLiveStatus;
            // do nothing if the status hasn't changed.
            if (dbVideo.status === apiVideo.liveStatus) continue;

            if (apiVideo.liveStatus === "Unknown") {
                newStatus = YouTubeLiveStatus.Offline;
            } else {
                newStatus = apiVideo.liveStatus;
            }

            const { status: oldStatus } = dbVideo;

            this.logger.debug(`Old: ${oldStatus}, new: ${newStatus}`);

            // this is not the prettiest solution but it's gotta work for now.

            if (newStatus) {
                await this.videoRepo.update(
                    {
                        id: apiVideo.id,
                    },
                    {
                        status: newStatus,
                    },
                );

                // ignore changes we don't generate notifs for
                if (newStatus == "offline" && oldStatus == "upcoming") return;

                this.generateNotif(apiVideo, newStatus);
            }
        }
    }

    private simplifyVideo(video: youtube_v3.Schema$Video, videoId?: string): SimplifiedYouTubeVideo {
        const id = videoId ?? video.id;
        if (!video)
            return {
                id,
                channelId: "invalid",
                description: "not found",
                title: "not found",
                liveStatus: "Unknown",
            };

        const { snippet } = video;

        return {
            channelId: snippet.channelId,
            id: video.id,
            description: snippet.description,
            liveStatus: this.getStatus(video),
            title: snippet.title,
        };
    }

    /**
     * Sends a command to the Discord client to send out a notification.
     */
    public generateNotif(
        rawVideo: SimplifiedYouTubeVideo | youtube_v3.Schema$Video,
        statusChange: YouTubeStatusChange,
    ): void {
        if ((rawVideo as youtube_v3.Schema$Video).snippet) rawVideo = this.simplifyVideo(rawVideo);

        // TypeScript you massive pain in the backside
        const video = rawVideo as SimplifiedYouTubeVideo;

        this.commandBus.execute(
            new TriggerActionsCommand({
                event: statusChange,
                platform: "youtube",
                channelId: video.channelId,
                url: `https://www.youtube.com/watch?v=${video.id}`,
            }),
        );
    }

    private async rescanVideos() {
        if (this.channelList.length == 0) {
            const channels = await this.queryBus.execute(new FindChannelQuery().forPlatform("youtube"));
            this.channelList = channels.map(channel => channel.platformId);
        }

        const channelId = this.channelList.shift();
        if (!channelId) return;
        const url = `${YOUTUBE_VIDEO_FEED_URL}?channel_id=${channelId}`;

        const xml = await axios.get(url).then(res => this.rssParser.parse(res.data));
        const videoIds: string[] = xml.feed.entry.map(entry => entry["yt:videoId"]).filter(id => id);

        const databaseVideos = await this.videoRepo.find({
            where: {
                channelId,
                id: In(videoIds),
            },
        });

        const difference = Util.symmetricSetDifference(new Set(videoIds), new Set(databaseVideos.map(v => v.id)));

        for (const videoId of difference) {
            const { unavailable, video, inserted } = await this.process(videoId);

            if (unavailable) {
                this.generateNotif({ ...(video ?? {}), id: videoId, channelId }, "offline");
                continue;
            }

            const newStatus = this.simplifyVideo(video).liveStatus as YouTubeLiveStatus;
            this.generateNotif(
                video,
                this.getStatusChange(databaseVideos.find(video => video.id == videoId)?.status, newStatus),
            );
        }
    }

    private getStatusChange(
        oldStatus: YouTubeLiveStatus | null,
        newStatus: YouTubeLiveStatus,
    ): YouTubeStatusChange | null {
        if (oldStatus == newStatus) return null;
        if (!oldStatus && newStatus == YouTubeLiveStatus.Offline) return "upload";
        else return newStatus as YouTubeStatusChange;
    }
}
