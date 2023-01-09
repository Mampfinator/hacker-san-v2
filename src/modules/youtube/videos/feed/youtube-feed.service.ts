import { Injectable } from "@nestjs/common";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { YOUTUBE_VIDEO_FEED_URL } from "../constants";
import { RawYouTubeFeed, RawYouTubeFeedEntry, YouTubeFeed, YouTubeFeedEntry } from "./youtube-feed.interfaces";

/**
 * Handles requests to the YouTube feed, and does its XML parsing magic.
 */
@Injectable()
export class YouTubeFeedService {
    private readonly xmlParser = new XMLParser();

    public async fetch(channelId: string): Promise<YouTubeFeed> {
        const url = `${YOUTUBE_VIDEO_FEED_URL}?channel_id=${channelId}`;

        const { feed: rawFeed }: { feed: RawYouTubeFeed } = await axios
            .get(url)
            .then(res => this.xmlParser.parse(res.data));

        const feed: YouTubeFeed = {
            channelId,
            name: rawFeed.author.name,
            url: rawFeed.author.uri,
            published: new Date(rawFeed.published),
            entries: rawFeed.entry.map(entry => this.processEntry(entry)),
        };

        return feed;
    }

    private processEntry(entry: RawYouTubeFeedEntry): YouTubeFeedEntry {
        return {
            id: entry["yt:videoId"],
            published: new Date(entry.published),
            updated: new Date(entry.updated),
        };
    }
}
