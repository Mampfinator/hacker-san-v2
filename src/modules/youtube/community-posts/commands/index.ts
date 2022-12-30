import { FetchPostHandler } from "./fetch-post.handler";
import { FetchPostsHandler } from "./fetch-posts.handler";
import { SyncPostsHandler } from "./sync-posts.handler";

export const YouTubeCommunityPostCommandHandlers = [
    FetchPostHandler,
    FetchPostsHandler,
    SyncPostsHandler,
];

export * from "./fetch-post.command";
export * from "./fetch-posts.command";
export * from "./sync-posts.command";
