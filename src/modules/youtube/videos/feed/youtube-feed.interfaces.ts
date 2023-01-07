export interface RawYouTubeFeedEntry {
    id: string;
    "yt:videoId": string;
    "yt:channelId": string;
    title: string;
    link: any;
    author: {
        name: string;
        uri: string;
    };

    published: string;
    updated: string;

    "media:group": {
        "media:title": string;
        "media:content": any;
        "media:thumbnail": any;
        "media:description": string;
        "media:community": {
            "media:starRating": any;
            "media:statistics": any;
        };
    };
}

export interface RawYouTubeFeed {
    id: string;
    link: { rel: string; href: string }[];
    "yt:ChannelId"?: string; // apparently broken?
    title: string;
    author: {
        name: string;
        uri: string;
    };
    published: string;
    entry: RawYouTubeFeedEntry[];
}

export interface YouTubeFeedEntry {
    id: string;
    published: Date;
    updated: Date;
}

export interface YouTubeFeed {
    /**
     * Whatever channel ID was passed to the fetcher, since feed:yt:channelId seems to be broken.
     */
    channelId: string;
    name: string;
    url: string;
    published: Date;
    entries: YouTubeFeedEntry[];
}
