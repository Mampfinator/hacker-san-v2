import axios from "axios";
import {
    ChannelInfo,
    CommunityPost,
    extractChannelInfo,
    extractCommunityPosts,
} from "yt-scraping-utilities";

export const sleep = (ms: number) =>
    new Promise<void>(res => setTimeout(res, ms));

export const tryFetchPosts = async (
    channelId: string,
    retries: number,
    timeout: number,
) => {
    const url = `https://youtube.com/channel/${channelId}/community`;

    const errors: Error[] = [];

    let posts: CommunityPost[];
    let channel: ChannelInfo;
    let currentTry = 0;
    while ((!posts || posts?.length == 0) && currentTry < retries) {
        currentTry++;
        try {
            const data = (await axios.get(url)).data;
            posts = extractCommunityPosts(data);
            channel = extractChannelInfo(data);
        } catch (error) {
            errors.push(error);
            await sleep(timeout);
        }
    }

    return {posts, channel, errors};
};
