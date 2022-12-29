import { Injectable } from "@nestjs/common";
import { extractCommunityPosts } from "yt-scraping-utilities";
import { YouTubeService } from "../youtube.service";

@Injectable()
export class YouTubeCommunityPostsRequestService {
    constructor(
        private readonly youtubeService: YouTubeService,
    ) {}

    public async fetchPostById(postId: string) {
        const data = await this.youtubeService.fetchRaw(
            `https://youtube.com/post/${postId}`,
            {
                maxRetries: 3,
                requeuePriority: "high",
            },
            false,
        ) as string;

        const [post] = extractCommunityPosts(data);
    }


    public async fetchPostsByChannelId(channelId: string) {

    }
}