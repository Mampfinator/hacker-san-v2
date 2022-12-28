import { CommandBus, CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SyncPostsCommand } from "./sync-posts.command";
import { CommunityPost as CommunityPostEntity } from "../model/community-post.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { YouTubeService } from "../../youtube.service";
import {
    findActiveTab,
    parseRawData,
    CommunityPost,
    extractPost,
} from "yt-scraping-utilities";
import { findValuesByKeys } from "yt-scraping-utilities/dist/util";
import { Logger } from "@nestjs/common";

@CommandHandler(SyncPostsCommand)
export class SyncPostsHandler implements ICommandHandler<SyncPostsCommand> {
    private readonly logger = new Logger(SyncPostsHandler.name);

    constructor(
        @InjectRepository(CommunityPostEntity)
        private readonly postRepo: Repository<CommunityPostEntity>,
        private readonly youtubeService: YouTubeService,
    ) {}

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
            let clickTrackingParams: string;

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
                        { requestOptions: { headers } },
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

            /*Object.assign(headers, {
                "X-Youtube-Client-Name": "1",
                "X-Youtube-Client-Version": YOUTUBE_CLIENT_VERSION,
                "X-Youtube-Bootstrap-Logged-In": false,
                "X-Goog-EOM-Visitor-Id": visitorData,
                Origin: "https://youtube.com",
                Host: "www.youtube.com",
            });*/

            while (continuationToken) {
                /*const body = {
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
                    },
                    false,
                )) as Record<string, any>;*/
                // TODO: type properly
                const data = await this.youtubeService.doContinuationRequest<
                    any,
                    "",
                    true
                >({
                    visitorData,
                    token: continuationToken,
                    clickTrackingParams,
                });

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
