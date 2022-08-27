import { CommandBus, CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SyncPostsCommand } from "./sync-posts.command";
import { CommunityPost as CommunityPostEntity } from "../model/community-post.entity";
import { Repository } from "typeorm";
import { FetchPostsCommand } from "./fetch-posts.command";
import { InjectRepository } from "@nestjs/typeorm";
import { Cookie, CookieJar } from "tough-cookie";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { YouTubeService } from "../../youtube.service";
import {
    findActiveTab,
    parseRawData,
    CommunityPost,
    extractCommunityPosts,
    extractPost,
} from "yt-scraping-utilities";
import { findValuesByKeys } from "yt-scraping-utilities/dist/util";
import {
    YOUTUBE_BROWSE_ENDPOINT,
    YOUTUBE_CLIENT_VERSION,
} from "../../constants";
import { Logger, OnModuleInit } from "@nestjs/common";
import { createHash } from "crypto";
import { launch } from "puppeteer";
import { getStoreByPage } from "puppeteer-tough-cookie-store";
import { sleep } from "../../util";

@CommandHandler(SyncPostsCommand)
export class SyncPostsHandler
    implements ICommandHandler<SyncPostsCommand>, OnModuleInit
{
    private readonly logger = new Logger(SyncPostsHandler.name);
    private cookies: CookieJar;

    constructor(
        @InjectRepository(CommunityPostEntity)
        private readonly postRepo: Repository<CommunityPostEntity>,
        private readonly youtubeService: YouTubeService,
    ) {}
    async onModuleInit() {
        // TODO: *maybe* move to YouTubeService, since I can then just route all requests through a client that has the appropriate consent cookies.
        const browser = await launch({
            headless: true,
        });

        const page = await browser.newPage();
        await page.goto(`https://youtube.com/`);

        let success = false;
        while (!success) {
            await sleep(250);
            await page
                .click(
                    ".eom-buttons.style-scope.ytd-consent-bump-v2-lightbox>div>ytd-button-renderer",
                )
                .then(() => {
                    success = true;
                    this.logger.debug(`Success!`);
                })
                .catch(() => {
                    success = false;
                    this.logger.debug(
                        `Failed getting new cookies from YouTube.`,
                    );
                });
        }

        const cookieJar = new CookieJar(await getStoreByPage(page));
        const cookies = await cookieJar.getCookies("https://youtube.com");
        this.cookies = new CookieJar();
        for (const cookie of cookies) {
            await this.cookies.setCookie(cookie, "https://youtube.com");
        }

        this.logger.debug(
            `Got cookies from puppeteer: \n${cookies
                .map(cookie => cookie.toString())
                .join("\n")}`,
        );

        await browser.close();
    }

    private getPostsAndToken(
        data: Record<string, any>,
    ): [CommunityPost[], string | undefined] {
        const posts: CommunityPost[] = findValuesByKeys(data, [
            "sharedPostRenderer",
            "backstagePostRenderer",
        ]).map(extractPost);

        const [continuationRenderer] = findValuesByKeys(data, [
            "continuationItemRenderer",
        ]);
        const token =
            continuationRenderer?.continuationEndpoint?.continuationCommand
                ?.token;

        return [posts, token];
    }

    async execute({ channelId, posts }: SyncPostsCommand) {
        if (!channelId && typeof posts !== "object")
            throw new TypeError(
                "Either channelId or posts needs to be defined.",
            );

        if (channelId && !posts) {
            this.logger.debug(`Fetching all posts for ${channelId}.`);
            let clickTrackingParams: Record<string, any>;

            const client = wrapper(axios.create({ jar: this.cookies }));

            const communityUrl = `https://youtube.com/channel/${channelId}/community`;
            const headers: Record<string, string> = {
                Referer: "https://youtube.com",
            };

            this.logger.debug(`Fetching community page for ${channelId}.`);
            let ytInitialData, communityTab;
            while (!communityTab) {
                try {
                    const data = (await this.youtubeService.fetchRaw(
                        communityUrl,
                        { useInstance: client, requestOptions: { headers } },
                        false,
                    )) as string;
                    ytInitialData = parseRawData({
                        source: data,
                        ytInitialData: true,
                    }).ytInitialData;
                    communityTab = findActiveTab(ytInitialData);
                } catch (error) {
                    this.logger.warn(`Failed fetching page for ${channelId}.`);
                    if (error instanceof Error) {
                        this.logger.error(error, error.stack);
                    }
                }
            }

            clickTrackingParams =
                communityTab.tabRenderer.content.sectionListRenderer
                    .trackingParams;
            const visitorData =
                ytInitialData.responseContext.webResponseContextExtensionData
                    .ytConfigData.visitorData;

            let [allPosts, continuationToken] =
                this.getPostsAndToken(ytInitialData);

            Object.assign(headers, {
                "X-Youtube-Client-Name": "1",
                "X-Youtube-Client-Version": YOUTUBE_CLIENT_VERSION,
                "X-Youtube-Bootstrap-Logged-In": false,
                "X-Goog-EOM-Visitor-Id": visitorData,
                Origin: "https://youtube.com",
                Host: "www.youtube.com",
                Cookies: (await this.cookies.getCookies("https://youtube.com"))
                    .map(cookie => cookie.toString())
                    .join("; "),
            });

            // TODO: test if this is even necessary?
            const SAPISID = (await this.cookies.getCookies(communityUrl)).find(
                cookie => cookie.key === "SASIPID",
            );
            if (SAPISID) {
                const time = `${Math.round(new Date().getTime() / 1000)}`;
                Object.assign(headers, {
                    Authorization: `SAPISIDHASH ${time}_${createHash("sha1")
                        .update(Buffer.from(time))
                        .update(Buffer.from(SAPISID.value))
                        .update(Buffer.from("https://www.youtube.com"))
                        .digest("hex")}`,
                });
            }

            while (continuationToken) {
                const body = {
                    context: {
                        client: {
                            clientName: "WEB",
                            clientVersion: YOUTUBE_CLIENT_VERSION,
                            originalUrl: "https://youtube.com",
                            visitorData,
                        },
                        clickTracking: { clickTrackingParams },
                    },
                    continuation: continuationToken,
                };

                const data = (await this.youtubeService.fetchRaw(
                    YOUTUBE_BROWSE_ENDPOINT,
                    {
                        requestOptions: { data: body, headers, method: "POST" },
                        useInstance: client,
                    },
                    false,
                )) as Record<string, any>;
                const [newPosts, newToken] = this.getPostsAndToken(data);
                allPosts.push(...newPosts);

                headers.clickTrackingParams =
                    data.onResponseReceivedEndpoints[0].clickTrackingParams;
                continuationToken = newToken;
            }

            posts = allPosts;
            this.logger.debug(
                `Found a total of ${posts.length} posts for ${channelId}.`,
            );
        }

        for (const post of posts) {
            await this.postRepo.upsert(
                {
                    id: post.id,
                },
                ["id"],
            );
        }
    }
}
