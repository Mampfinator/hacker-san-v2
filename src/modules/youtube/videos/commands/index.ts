import { FetchPostsHandler } from "../../community-posts/commands/fetch-posts.handler";
import { SyncPostsHandler } from "../../community-posts/commands/sync-posts-event.handler";
import { SubscribeHandler } from "./subscribe.handler";
import { UnsubscribeHandler } from "./unsubscribe.handler";

export { SubscribeCommand } from "./subscribe.command";
export { UnsubscribeCommand } from "./unsubscribe.command";

export const YouTubeCommandHandlers = [
    SubscribeHandler,
    UnsubscribeHandler,
    SyncPostsHandler,
    FetchPostsHandler,
];
