import { FindChannelHandler, InsertChannelHandler, UpdateChannelHandler } from "./channel";
export { FindChannelQuery, InsertChannelQuery, UpdateChannelQuery } from "./channel";

import { FindPostsHandler, InsertPostsHandler } from "./post";
export { FindPostsQuery, InsertPostsQuery } from "./post";

import { FindStreamHandler, InsertStreamHandler } from "./stream";
export { InsertQueryItem, InsertStreamQuery } from "./stream";

export const QueryHandlers = [
    // Channel handlers
    FindChannelHandler,
    InsertChannelHandler,
    UpdateChannelHandler,

    // Post handlers
    FindPostsHandler,
    InsertPostsHandler,

    // Stream handlers
    FindStreamHandler,
    InsertStreamHandler,
];
