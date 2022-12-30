import { FetchPostsHandler } from "../../community-posts/commands/fetch-posts.handler";
import { SyncPostsHandler } from "../../community-posts/commands/sync-posts.handler";
import { SubscribeHandler } from "./subscribe.handler";
import { UnsubscribeHandler } from "./unsubscribe.handler";

export { SubscribeCommand } from "./subscribe.command";
export { UnsubscribeCommand } from "./unsubscribe.command";

export const YouTubeVideoCommandHandlers = [SubscribeHandler, UnsubscribeHandler, FetchPostsHandler];
