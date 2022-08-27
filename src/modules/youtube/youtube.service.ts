import { Injectable, Logger } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { Repository } from "typeorm";
import { YouTubeChannel } from "./model/youtube-channel.entity";
import { SyncVideosCommand } from "./videos/commands/sync-videos.command";
import { YouTubeEventSubService } from "./videos/youtube-eventsub.service";
import { YouTubeVideosService } from "./videos/youtube-video.service";
import { sleep } from "./util";
import { SyncPostsCommand } from "./community-posts/commands/sync-posts.command";
import { COMMUNITY_POST_SLEEP_TIME, EVENTSUB_SLEEP_TIME } from "./constants";
import { YouTubeCommunityPostsService } from "./community-posts/youtube-community-posts.service";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { InjectRepository } from "@nestjs/typeorm";

export interface FetchRawOptions {
    maxRetries?: number;
    /**
     * "high" puts the request back at the bottom of the queue, "low" puts it on top. Defaults to low.
     */
    requeuePriority?: "high" | "low";
    /**
     * Options to pass to Axios for the request.
     */
    requestOptions?: AxiosRequestConfig<any>;
    /**
     * Use your own Axios instance for the request instead. RequestOptions still get passed to it.
     */
    useInstance?: AxiosInstance;
}

type RequestQueueItem = {
    callback: () => Promise<string | AxiosResponse>;
    resolve: (value: string | AxiosResponse) => any;
    options?: FetchRawOptions;
};

@Injectable()
export class YouTubeService {
    private readonly logger = new Logger(YouTubeService.name);
    private readonly skipSync: boolean;

    private readonly requestQueue: RequestQueueItem[] = [];
    private readonly retryCounter = new WeakMap<RequestQueueItem, number>();

    constructor(
        @InjectRepository(YouTubeChannel)
        private readonly channels: Repository<YouTubeChannel>,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly commandBus: CommandBus,
        private readonly eventSub: YouTubeEventSubService,
        private readonly videos: YouTubeVideosService,
        private readonly postService: YouTubeCommunityPostsService,
        config: ConfigService,
    ) {
        this.skipSync = config.getOrThrow<boolean>("SKIP_SYNC");
    }

    public async init() {
        const channels = await this.channels.find();
        const channelLoggers = channels.map(
            ({ channelId }) => new Logger(`YouTubeStartup:${channelId}`),
        );

        if (this.skipSync) this.logger.log("Skipping synchronization.");
        else {
            this.logger.log(
                `Starting synchronization tasks. This will take approximately ${
                    (channels.length * COMMUNITY_POST_SLEEP_TIME) / 1000
                }s for full synchronization.`,
            );
        }

        const subscriptionPromises: Promise<any>[] = [];
        const communitypostPromises: Promise<any>[] = [];

        for (let i = 0; i < channels.length; i++) {
            const { channelId } = channels[i];
            const logger = channelLoggers[i];

            logger.debug(`Scheduling startup tasks.`);

            subscriptionPromises.push(
                sleep(EVENTSUB_SLEEP_TIME * i).then(async () => {
                    logger.debug("Subscribing to push notifications.");
                    await this.eventSub.subscribe(channelId);
                }),
            );

            if (!this.skipSync)
                communitypostPromises.push(
                    sleep(COMMUNITY_POST_SLEEP_TIME * i).then(async () => {
                        logger.debug("Syncing community posts.");
                        await this.commandBus.execute(
                            new SyncPostsCommand({ channelId }),
                        );
                        logger.debug("Synced community posts.");
                    }),
                );

            if (!this.skipSync) {
                logger.debug("Syncing videos.");
                await this.commandBus.execute(new SyncVideosCommand(channelId));
                logger.debug("Synced videos.");
            }
        }

        const subResults = await Promise.allSettled(subscriptionPromises);
        const postResults = await Promise.allSettled(communitypostPromises);

        const subResultErrors = subResults.filter(
            res => res.status === "rejected",
        );
        const postResultErrors = postResults.filter(
            res => res.status === "rejected",
        );

        this.logger.log(
            `Started. ${
                subResultErrors.length > 0 || postResultErrors.length > 0
                    ? "There are startup errors."
                    : "There are no startup errors."
            }`,
        );

        if (subResultErrors.length > 0)
            this.logger.log(
                `There are ${subResultErrors.length} subscription errors`,
            );
        if (postResultErrors.length > 0)
            this.logger.log(
                `There are ${
                    postResults.filter(r => r.status === "rejected").length
                } community post syncing errors`,
            );

        for (let i = 0; i < channels.length; i++) {
            const subResult = subResults[i];
            const postResult = postResults[i];
            const logger = channelLoggers[i];

            if (subResult?.status == "rejected") {
                logger.warn(`Failed to set up: ${subResult.reason}`);
            }

            if (postResult?.status == "rejected") {
                logger.warn(`Failed to set up: ${postResult.reason}`);
            }
        }

        // start checking for new posts as soon as all posts are synced.
        this.schedulerRegistry.addInterval(
            "CHECK_COMMUNITY_POSTS",
            setInterval(() => {
                this.postService.checkPosts();
            }, 1500),
        );
        this.logger.debug("Scheduling YouTube community post check.");
    }

    /**
     * Fetches raw pages from YouTube. Since YouTube's rate limits for crawling/scraping are extremely stingy, this needs to work like a request queue.
     */
    public async fetchRaw<T extends boolean>(
        url: string,
        options?: FetchRawOptions,
        returnResponse?: T,
    ): Promise<T extends true ? AxiosResponse : string | Record<string, any>> {
        return new Promise<any>(resolve => {
            const callback: () => Promise<string | AxiosResponse> = async () => {
                const client: AxiosInstance = options?.useInstance ?? axios;
                const res = await client(url, {method: "GET", ...(options?.requestOptions ?? {})});
                if (returnResponse) return res;
                else return res.data;
            };

            this.requestQueue.push({ resolve, callback, options });
        });
    }

    @Interval(1250)
    private async workRequestQueue() {
        if (this.requestQueue.length == 0) return;

        const item = this.requestQueue.shift();
        const value = await item.callback().catch(reason => {
            const retryCount = this.retryCounter.get(item) ?? 0;
            if (
                item.options?.maxRetries &&
                retryCount < item.options.maxRetries
            ) {
                // TODO: check for 404, 403 (since that's the error YouTube returns when you get blocked) and don't requeue/stop the queue.

                // requeue the item.
                this.requestQueue[
                    (item.options.requeuePriority ?? "low") == "high"
                        ? "unshift"
                        : "push"
                ](item);
                this.retryCounter.set(item, retryCount + 1);
            }
        });

        if (!value) return;

        item.resolve(value);
    }
}
