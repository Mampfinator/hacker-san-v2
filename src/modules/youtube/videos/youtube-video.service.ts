import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus } from "@nestjs/cqrs";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { google, youtube_v3 } from "googleapis";
import { YouTubeConfig } from "src/modules/config/config";
import { SendNotificationCommand } from "src/modules/discord/commands/send-notification.command";
import { In, Repository } from "typeorm";
import { YouTubeLiveStatus, YouTubeVideo } from "../model/youtube-video.entity";

interface SimplifiedYouTubeVideo {
    id: string; 
    liveStatus: YouTubeLiveStatus | "Unknown"; // for privated, deleted, etc videos

    title: string;
    description: string;

    channelId: string;

    // Dates
    scheduledStart?: Date;
    liveAt?: Date;
    endedAt?: Date;
    scheduledEnd?: Date;
}

type YouTubeStatusChange = "live" | "upcoming" | "upload" | "offline";


@Injectable()
export class YouTubeVideosService {
    private readonly apiClient: youtube_v3.Youtube;
    private readonly logger = new Logger(YouTubeVideosService.name); 

    constructor(
        private readonly configService: ConfigService,
        private readonly commandBus: CommandBus,
        @InjectRepository(YouTubeVideo) private readonly videoRepo: Repository<YouTubeVideo>
    ) {

        const apiKey = configService.getOrThrow<YouTubeConfig>("YOUTUBE").apiKey;
        if (!apiKey) this.logger.warn("No YouTube API key provided.");
        
        this.apiClient = google.youtube({
            version: "v3",
            auth: apiKey
        });
    }

    /**
     * Processes potentially new videos. 
     * If a video is not new, returns false. 
     * If a video is new, does some API & database magic and return true. 
     */
    public async process(video: string | youtube_v3.Schema$Video): 
        Promise<{inserted: boolean, unavailable?: boolean, video?: youtube_v3.Schema$Video}> 
    {
        const videoId = typeof video === "string" ? video : video.id!;
        const knownVideo = await this.videoRepo.findOne({where: {id: videoId}});
        if (knownVideo) return {inserted: false};


        const apiVideo: youtube_v3.Schema$Video = typeof video === "string" ?
            (await this.apiClient.videos.list({
                id: [video],
                part: ["snippet", "liveStreamingDetails"]
            })).data.items?.[0] : video;
        if (!video) return {inserted: false, unavailable: true};

        if (!apiVideo) {
            this.logger.warn("Somehow could not find a video in the API...?");
        }

        const status = this.getStatus(apiVideo);
        if (!status) return;

        await this.videoRepo.insert({
            id: apiVideo.id,
            status,
            channelId: apiVideo.snippet.channelId
        });

        return {inserted: true, video: apiVideo};
    }

    public getStatus(video: youtube_v3.Schema$Video): YouTubeLiveStatus {
        const {liveBroadcastContent} = video.snippet;

        let status: YouTubeLiveStatus;
        switch(liveBroadcastContent) {
            case "none": status = YouTubeLiveStatus.Offline; break;
            case "live": status = YouTubeLiveStatus.Upcoming; break;
            case "upcoming": status = YouTubeLiveStatus.Upcoming; break;
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
                status: In([YouTubeLiveStatus.Live, YouTubeLiveStatus.Upcoming])
            }
        });

        if (dbVideos.length === 0) return;


        const apiVideos = (await this.apiClient.videos.list({
            id: dbVideos.map(video => video.id),
            part: ["snippet", "liveStreamingDetails"]
        })).data.items;

        let videos: Map<string, {db?: YouTubeVideo, api?: youtube_v3.Schema$Video}> = new Map();

        for (const video of dbVideos) {
            if (!videos.has(video.id)) videos.set(video.id, {db: video});
        }


        for (const video of apiVideos) {
            if (!videos.has(video.id)) videos.set(video.id, {api: video});
            else videos.get(video.id).api = video;
        }


        for (const [id, {db: dbVideo, api}] of videos) {
            const apiVideo = this.simplifyVideo(api, id);
            
            let newStatus: YouTubeLiveStatus;
            // do nothing if the status hasn't changed.
            if (dbVideo.status === apiVideo.liveStatus) continue;

            if (apiVideo.liveStatus === "Unknown") {
                newStatus = YouTubeLiveStatus.Offline;
            } else {
                newStatus = apiVideo.liveStatus;
            }

            const {status: oldStatus} = dbVideo;
            let statusChange: YouTubeStatusChange | undefined;
            switch(true) {
                case oldStatus === YouTubeLiveStatus.Live && newStatus === YouTubeLiveStatus.Offline:
                    statusChange = "offline"; break;
                case oldStatus === YouTubeLiveStatus.Upcoming && newStatus === YouTubeLiveStatus.Live:
                    statusChange == "live"; break; 
                default: 
                    statusChange = undefined;
            }

            if (statusChange) {
                await this.videoRepo.update(
                    {
                        id: apiVideo.id,
                    }, 
                    {
                        status: newStatus
                    }
                );

                this.generateNotif(apiVideo, statusChange);
            };
        }
    }

    private simplifyVideo(video: youtube_v3.Schema$Video, videoId?: string): SimplifiedYouTubeVideo {
        const id = videoId ?? video.id;
        if (!video) return {
            id,
            channelId: "invalid",
            description: "not found",
            title: "not found",
            liveStatus: "Unknown"
        }

        const {snippet, liveStreamingDetails} = video;


        return {
            channelId: snippet.channelId,
            id: video.id,
            description: snippet.description,
            liveStatus: this.getStatus(video),
            title: snippet.title
        }
    }

    //TODO: treat database as cache
    /**
     * Sends a command to the Discord client to send out a notification. 
     */
    public generateNotif(rawVideo: SimplifiedYouTubeVideo | youtube_v3.Schema$Video, statusChange: YouTubeStatusChange): void {
        const eventDescriptor: `youtube:${YouTubeStatusChange}` = `youtube:${statusChange}`;
        
        if ((rawVideo as youtube_v3.Schema$Video).snippet) rawVideo = this.simplifyVideo(rawVideo);

        // TypeScript you massive pain in the backside
        const video = rawVideo as SimplifiedYouTubeVideo;

        this.commandBus.execute(new SendNotificationCommand({
            eventDescriptor: "youtube:post",
            channelId: video.channelId,
            url: `https://youtube.com/watch?v=${video.id}`
        }));
    }
}