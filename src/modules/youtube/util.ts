import axios from "axios";
import {
    ChannelInfo,
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

    let data: any;
    let currentTry = 0;
    while (!data && currentTry < retries) {
        currentTry++;
        try {
            data = (await axios.get(url)).data;
        } catch (error) {
            errors.push(error);
            await sleep(timeout);
        }
    }

    if (data) {
        const posts = extractCommunityPosts(data); // if these aren't present, we definitely throw.

        let channel: ChannelInfo;

        try {
            channel = extractChannelInfo(data);
        } catch {}

        return { channel, posts };
    }
};
