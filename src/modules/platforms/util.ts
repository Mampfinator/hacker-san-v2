import { Event } from "../../constants";
import { StreamStatus } from "./models/stream.entity";

type StatusChange = Exclude<Event, "post"> | "invalid" | undefined;

const EVENT_MAP: Record<StreamStatus | "undefined", Record<StreamStatus | "undefined", StatusChange>> = {
    live: {
        live: undefined,
        upcoming: "invalid",
        offline: "offline",
        undefined: "offline",
    },
    upcoming: {
        live: "live",
        upcoming: undefined,
        offline: "invalid", // we missed the stream; not the worst that could happen, but this may indicate an error.
        undefined: undefined,
    },
    offline: {
        live: "invalid",
        upcoming: "invalid",
        offline: undefined,
        undefined: undefined,
    },
    undefined: {
        live: "live",
        upcoming: "upcoming",
        offline: "upload",
        undefined: "invalid", // how did we get here?
    },
};

export function getStatusChangeEvent(old: StreamStatus | undefined, now: StreamStatus | undefined): StatusChange {
<<<<<<< HEAD
    return EVENT_MAP[String(old)][String(now)];
=======
    return EVENT_MAP[old][old];
>>>>>>> c4f6a92 (Removed YouTubeVideo entity)
}
