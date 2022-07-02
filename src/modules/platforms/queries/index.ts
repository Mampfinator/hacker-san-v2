import { ChannelQueryHandler } from "./channel.handler";
import { StreamQueryHandler } from "./stream.handler";

export { ChannelQuery, ChannelQueryOptions } from "./channel.query";
export { StreamQuery, StreamQueryOptions } from "./stream.query";

export const QueryHandlers = [ChannelQueryHandler, StreamQueryHandler];
