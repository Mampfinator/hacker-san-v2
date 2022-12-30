import { Injectable } from "@nestjs/common";
import {
    ChannelInfo,
    CommunityPost,
    extractChannelInfo,
    extractCommunityPosts,
    extractPost,
} from "yt-scraping-utilities";
import {
    findActiveTab,
    findValuesByKeys,
    parseRawData,
} from "yt-scraping-utilities/dist/util";
import { YouTubeService } from "../youtube.service";

export interface FetchPostsOptions<C extends boolean> {
    channelId: string;
    fetchAll?: boolean;
    includeChannel?: C;
}

@Injectable()
export class YouTubeCommunityPostsRequestService {
    constructor(private readonly youtubeService: YouTubeService) {}

    public async fetchSinglePost<C extends boolean>(
        postId: string,
        includeChannel?: C,
    ): Promise<
        C extends true
            ? { channel: ChannelInfo; post: CommunityPost }
            : CommunityPost
    >;
    public async fetchSinglePost(
        postId: string,
        includeChannel?: boolean,
    ): Promise<{ channel: ChannelInfo; post: CommunityPost } | CommunityPost> {
        const data = (await this.youtubeService.fetchRaw(
            `https://youtube.com/post/${postId}`,
            {
                maxRetries: 3,
                requeuePriority: "high",
            },
            false,
        )) as string;

        const { ytInitialData } = parseRawData({
            source: data,
            ytInitialData: true,
        });
        const [post] = extractCommunityPosts(ytInitialData);

        if (!includeChannel) return post;
        else {
            const channel = extractChannelInfo(ytInitialData);
            return { channel, post };
        }
    }

    public async fetchPosts<C extends boolean>(
        options: FetchPostsOptions<C>,
    ): Promise<
        C extends true
            ? { channel: ChannelInfo; posts: CommunityPost[] }
            : CommunityPost[]
    >;
    public async fetchPosts({
        fetchAll,
        includeChannel,
        channelId,
    }: FetchPostsOptions<any>): Promise<
        CommunityPost[] | { channel: ChannelInfo; posts: CommunityPost[] }
    > {
        const initialPage = (await this.youtubeService.fetchRaw(
            `https://youtube.com/channel/${channelId}/community`,
            {
                maxRetries: 3,
                requeuePriority: "high",
            },
            false,
        )) as string;

        const { ytInitialData } = parseRawData({
            source: initialPage,
            ytInitialData: true,
        });

        const posts = extractCommunityPosts(ytInitialData);

        const communityTab = findActiveTab(ytInitialData);

        let { trackingParams } = communityTab.tabRenderer.content
            .sectionListRenderer as { trackingParams: string };
        const { visitorData } =
            ytInitialData.responseContext.webResponseContextExtensionData
                .ytConfigData;
        let continuationToken = this.getContinuationToken(ytInitialData);

        while (continuationToken && !fetchAll) {
            const data = await this.youtubeService.doContinuationRequest<
                any,
                "",
                true
            >({
                visitorData,
                token: continuationToken,
                clickTrackingParams: trackingParams,
            });

            posts.push(...this.getPosts(data));
            continuationToken = this.getContinuationToken(data);
        }

        if (!includeChannel) return posts;
        else {
            const channel = extractChannelInfo(ytInitialData);
            return { posts, channel };
        }
    }

    /**
     *
     */
    private getPosts(data: Record<string, any>): CommunityPost[] {
        const posts: CommunityPost[] = findValuesByKeys(data, [
            "sharedPostRenderer",
            "backstagePostRenderer",
        ]).map(extractPost);

        return posts;
    }

    private getContinuationToken(
        data: Record<string, any>,
    ): string | undefined {
        const [continuationRenderer] = findValuesByKeys(data, [
            "continuationItemRenderer",
        ]);

        const token: string =
            continuationRenderer?.continuationEndpoint?.continuationCommand
                ?.token;

        return token;
    }
}
