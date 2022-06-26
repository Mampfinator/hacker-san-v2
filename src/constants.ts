export type Platform = "youtube" | "twitter";
export const SUPPORTED_PLATFORMS: Platform[] = ["youtube", "twitter"];
export const PALTFORM_NAME_LOOKUP: {[Property in Platform]: string} = {
    youtube: "YouTube",
    twitter: "Twitter",
};

// TODO: Split offline into seperate stream:offline and channel:offline events.
export type Event = "live" | "upload" | "offline" | "upcoming" | "post";
export const EVENT_NAME_LOOKUP: {[Property in Event]: string} = {
    live: "Live",
    upload: "Upload",
    offline: "Offline",
    upcoming: "Upcoming",
    post: "Post",
};

