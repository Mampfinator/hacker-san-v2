import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { YouTubeEventSubService } from "./videos/youtube-eventsub.service";
import { YouTubeVideosService } from "./videos/youtube-video.service";
import { sleep } from "./util";
import { SyncPostsCommand } from "./community-posts/commands/sync-posts.command";
import {
    COMMUNITY_POST_SLEEP_TIME,
    EVENTSUB_SLEEP_TIME,
    YOUTUBE_BROWSE_ENDPOINT,
    YOUTUBE_CLIENT_VERSION,
} from "./constants";
import { YouTubeCommunityPostsService } from "./community-posts/youtube-community-posts.service";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { launch } from "puppeteer";
import { CookieJar } from "tough-cookie";
import { getStoreByPage } from "puppeteer-tough-cookie-store";
import { wrapper } from "axios-cookiejar-support";
import { Primitive } from "../../util";
import { FullChannelCrawlCommand } from "./commands/full-channel-crawl.command";
import { VideoRenderer } from "yt-scraping-utilities";
import { ChannelQuery } from "../platforms/queries";
import { ChannelEntity } from "../platforms/models/channel.entity";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { YouTubeApiService } from "./youtube-api.service";

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

export interface ContinuationRequestOptions {
    visitorData: string;
    token: string;
    clickTrackingParams: string;
    SAPISID?: string;
}

export interface YouTubeBaseItem {
    trackingParams: string;
}

export type RendererType<ItemType extends object, ItemKey extends string> = {
    [key in Uncapitalize<ItemKey>]: ItemType;
};

export interface AppendContinuationItemsAction<ItemType extends YouTubeBaseItem, ItemKey extends string> {
    clickTrackingParams: string;
    appendContinuationItemsAction: {
        continuationItems:
            | [...RendererType<ItemType, ItemKey>[], RendererType<ContinuationItemRenderer, "continuationItemRenderer">]
            | RendererType<ItemType, ItemKey>[];
        targetId: string;
    };
}

// TODO: refactor. Current solution is *eh* at best.
export interface ContinuationResponse<
    T extends YouTubeBaseItem,
    ItemKey extends string,
    DirectAction extends boolean = false,
> {
    responseContext: {
        maxAgeSeconds: number;
        serviceTrackingParams: any[];
        mainAppWebResponseContext: any[];
        webResponseContextExtensionData: {
            hasDecorated: boolean;
        };
        trackingParams: string;
    };

    onResponseReceivedEndpoints: DirectAction extends false ? never : [AppendContinuationItemsAction<T, ItemKey>];

    onResponseReceivedActions: DirectAction extends true
        ? never
        : [AppendContinuationItemsAction<T, ItemKey>, ...any[]];
}

export interface ContinuationItemRenderer {
    trigger: string;
    continuationEndpoint: ContinuationEndpoint;
}

export interface ContinuationEndpoint {
    clickTrackingParams: string;
    commandMetadata: CommandMetadata;
    continuationCommand: ContinuationCommand;
}

export interface CommandMetadata {
    webCommandMetadata: WebCommandMetadata;
}

export interface WebCommandMetadata {
    sendPost: boolean;
    apiUrl: string;
}

export interface ContinuationCommand {
    token: string;
    request: string;
}

@Injectable()
export class YouTubeService implements OnModuleInit {
    private readonly logger = new Logger(YouTubeService.name);
    private readonly skipSync: boolean;

    private readonly requestQueue: RequestQueueItem[] = [];
    private readonly retryCounter = new WeakMap<RequestQueueItem, number>();

    private cookies: CookieJar;
    public client: AxiosInstance;

    constructor(
        private readonly queryBus: QueryBus,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly commandBus: CommandBus,
        private readonly eventSub: YouTubeEventSubService,
        private readonly videos: YouTubeVideosService,
        private readonly postService: YouTubeCommunityPostsService,
        config: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly apiService: YouTubeApiService,
    ) {
        this.skipSync = config.getOrThrow<boolean>("SKIP_SYNC");
    }

    public getAxiosInstance(config?: AxiosRequestConfig): AxiosInstance {
        const headers = config?.headers ?? {};
        Object.assign(headers, {
            cookies: this.cookies.getCookieStringSync("https://youtube.com"),
        });

        const options: AxiosRequestConfig = {
            ...(config ?? {}),
            jar: this.cookies,
            headers,
        };

        return wrapper(axios.create(options));
    }

    public async getCookies(): Promise<CookieJar> {
        const jar = new CookieJar();

        let promises: Promise<any>[] = [];
        for (const cookie of await this.cookies.getCookies("https://youtube.com")) {
            promises.push(jar.setCookie(cookie, "https://youtube.com"));
        }

        const results = await Promise.allSettled(promises);
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (!result || result.status == "fulfilled") continue;
            this.logger.error(`Could not copy cookie ${i} to new cookie jar: ${result.reason}`, result.reason.stack);
        }

        return jar;
    }

    async onModuleInit() {
        const browser = await launch({
            headless: true,
        });

        const page = await browser.newPage();
        await page.goto("https://youtube.com/");

        let cookieJar: CookieJar;
        let success = false;
        let failed = 0;

        while (!success) {
            await sleep(250);

            cookieJar = new CookieJar(await getStoreByPage(page));
            const button = await page.$(
                ".eom-buttons.style-scope.ytd-consent-bump-v2-lightbox>div>ytd-button-renderer",
            );

            if (button) {
                await button.click();
                success = true;
            } else {
                ++failed;

                if (failed > 5) {
                    const cookies = await cookieJar.getCookies("https://youtube.com/");
                    if (cookies.length > 0) success = true; // we only need some cookies set. And outside the GDPR region, we may not get the consent screen in the first place.
                }
            }
        }

        const cookies = await cookieJar.getCookies("https://youtube.com/");

        this.cookies = new CookieJar();
        for (const cookie of cookies) {
            await this.cookies.setCookie(cookie, "https://youtube.com/");
        }

        this.logger.debug(
            `Got cookies from YouTube via Puppeteer: \n${cookies.map(cookie => cookie.toString()).join("\n")}`,
        );

        this.client = this.getAxiosInstance({ method: "GET" });
    }

    private async purgeInvalidChannels() {
        this.logger.log("Verifying YouTube channel IDs.");

        const channelIds = await this.queryBus
            .execute<ChannelQuery, ChannelEntity[]>(
                new ChannelQuery({
                    one: false,
                    query: { where: { platform: "youtube" } },
                }),
            )
            .then(channels => channels.map(channel => channel.platformId));

        let invalidIds: string[] = [];

        for (let i = 0; i < channelIds.length; i += 50) {
            const batch = channelIds.slice(i, 50);
            const {
                data: { items: channels },
            } = await this.apiService.channels.list({
                id: batch,
                part: ["id"],
            });

            invalidIds.push(...batch.filter(id => !channels.find(c => c.id === id)));
        }

        if (invalidIds.length > 0) {
            this.logger.log(`Found ${invalidIds.length} invalid YouTube IDs (${invalidIds.join(", ")}) . Purging...`);
            // TODO: figure out which tables need purging
        } else {
            this.logger.log("No invalid channel IDs. No purging necessary.");
        }
    }

    private async sync() {
        const channels = await this.queryBus.execute<ChannelQuery, ChannelEntity[]>(
            new ChannelQuery({
                one: false,
                query: { where: { platform: "youtube" } },
            }),
        );

        const channelLoggers = channels.map(({ platformId }) => new Logger(`YouTubeStartup:${platformId}`));

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
            const { platformId: channelId, name: channelName } = channels[i];
            const logger = channelLoggers[i];

            logger.debug(`Scheduling startup tasks for ${channelName}.`);

            subscriptionPromises.push(
                sleep(EVENTSUB_SLEEP_TIME * i).then(async () => {
                    logger.debug("Subscribing to push notifications.");
                    await this.eventSub.subscribe(channelId);
                }),
            );

            // TODO: simplify because YouTubeService#rawFetch does rate limiting now.
            if (!this.skipSync) {
                logger.debug(`Syncing community posts.`);
                communitypostPromises.push(
                    this.commandBus.execute(new SyncPostsCommand({ channelId })).then(() => {
                        logger.debug("Synced community posts.");
                    }),
                );

                logger.debug("Doing full channel crawl.");
                const videos = await this.commandBus.execute<FullChannelCrawlCommand, VideoRenderer[]>(
                    new FullChannelCrawlCommand(channelId),
                );
                logger.debug(`Found ${videos.length} videos for full channel crawl.`);
            }
        }

        const subResults = await Promise.allSettled(subscriptionPromises);
        const postResults = await Promise.allSettled(communitypostPromises);

        const subResultErrors = subResults.filter(res => res.status === "rejected");
        const postResultErrors = postResults.filter(res => res.status === "rejected");

        this.logger.log(
            `Started. ${
                subResultErrors.length > 0 || postResultErrors.length > 0
                    ? "There are startup errors."
                    : "There are no startup errors."
            }`,
        );

        if (subResultErrors.length > 0) this.logger.log(`There are ${subResultErrors.length} subscription errors`);
        if (postResultErrors.length > 0)
            this.logger.log(
                `There are ${postResults.filter(r => r.status === "rejected").length} community post syncing errors`,
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
    }

    public async init() {
        await this.purgeInvalidChannels().catch(error => this.logger.error(error));
        await this.sync().catch(error => this.logger.error(error));

        // start checking for new posts as soon as all posts are synced.
        this.schedulerRegistry.addInterval(
            "CHECK_COMMUNITY_POSTS",
            setInterval(() => {
                this.postService.checkPosts();
            }, 1500),
        );
        this.logger.debug("Scheduling YouTube community post check.");

        this.eventEmitter.emit("youtube.ready", "youtube");
    }

    /**
     * Fetches raw pages from YouTube. Since YouTube's rate limits for crawling/scraping are extremely stingy, this needs to work like a request queue.
     */
    public async fetchRaw<T extends boolean>(
        options: FetchRawOptions,
        returnResponse: T,
    ): Promise<T extends true ? AxiosResponse : string | Record<string, any>>;
    public async fetchRaw<T extends boolean>(
        url: string,
        options?: FetchRawOptions,
        returnResponse?: T,
    ): Promise<T extends true ? AxiosResponse : string | Record<string, any>>;
    public async fetchRaw<T extends boolean>(
        optionsOrUrl: FetchRawOptions | string,
        optionsOrReturnResponse?: T | FetchRawOptions,
        returnResponse?: T,
    ) {
        const url = typeof optionsOrUrl == "string" ? optionsOrUrl : "";
        const options = typeof optionsOrUrl == "object" ? optionsOrUrl : (optionsOrReturnResponse as FetchRawOptions);

        return new Promise<any>(resolve => {
            const callback: () => Promise<string | AxiosResponse> = async () => {
                const instance: AxiosInstance = options?.useInstance ?? this.client;
                const res = await instance(url, options?.requestOptions);
                if (returnResponse) return res;
                else return res.data;
            };

            this.requestQueue.push({ resolve, callback, options });
        });
    }

    /**
     * Helper function that does continuation requests for the browse endpoint.
     */
    public async doContinuationRequest<T extends YouTubeBaseItem, ItemKey extends string, DirectAction extends boolean>(
        options: ContinuationRequestOptions,
    ): Promise<ContinuationResponse<T, ItemKey, DirectAction>> {
        const { token, clickTrackingParams, visitorData } = options;

        const headers: Record<string, Primitive> = {
            "X-Youtube-Client-Name": "1",
            "X-Youtube-Client-Version": YOUTUBE_CLIENT_VERSION,
            "X-Youtube-Bootstrap-Logged-In": false,
            "X-Goog-EOM-Visitor-Id": visitorData,
            Origin: "https://youtube.com",
            Host: "www.youtube.com",
            Cookies: await this.getCookies().then(jar => jar.getCookieString("https://youtube.com")),
        };

        const data: Record<string, any> = {
            context: {
                client: {
                    clientName: "WEB",
                    clientVersion: YOUTUBE_CLIENT_VERSION,
                    originalUrl: "https://youtube.com",
                    visitorData,
                },
                clickTracking: { clickTrackingParams },
            },
            continuation: token,
        };

        //const instance = this.getAxiosInstance();

        const responseData = await this.fetchRaw(
            YOUTUBE_BROWSE_ENDPOINT,
            {
                requestOptions: {
                    headers,
                    method: "POST",
                    data,
                },
            },
            false,
        );

        return responseData as ContinuationResponse<T, ItemKey, DirectAction>;
    }

    @Interval(1250)
    private async workRequestQueue() {
        if (this.requestQueue.length == 0) return;

        const item = this.requestQueue.shift();
        const value = await item.callback().catch(reason => {
            const retryCount = this.retryCounter.get(item) ?? 0;
            if (item.options?.maxRetries && retryCount < item.options.maxRetries) {
                // TODO: check for 404, 403 (since that's the error YouTube returns when you get blocked) and don't requeue/stop the queue.

                // requeue the item.
                this.requestQueue[(item.options.requeuePriority ?? "low") == "high" ? "unshift" : "push"](item);
                this.retryCounter.set(item, retryCount + 1);
            } else {
                this.logger.warn(
                    `Could not finish YouTube request: ${reason} ${reason.stack ? `\nStack: ${reason.stack}` : ""}.`,
                );
            }
        });

        if (!value) return;

        item.resolve(value);
    }
}
