import { CacheChannelInfoHandler } from "./cache-channel-info.handler";
import { EnsureYouTubeChannelHandler } from "./ensure-youtube-channel.handler";
import { FullChannelCrawlHandler } from "./full-channel-crawl.handler";

export { CacheChannelInfoCommand } from "./cache-channel-info.command";
export { EnsureYouTubeChannelCommand } from "./ensure-youtube-channel.command";
export { FullChannelCrawlCommand } from "./full-channel-crawl.command";

export const YouTubeCommandHandlers = [
    EnsureYouTubeChannelHandler,
    CacheChannelInfoHandler,
    FullChannelCrawlHandler,
];
