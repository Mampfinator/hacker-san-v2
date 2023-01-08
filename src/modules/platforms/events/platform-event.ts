import { Event } from "../../../constants";
import { ChannelEntity } from "../models/channel.entity";
import { PostEntity } from "../models/post.entity";
import { StreamEntity } from "../models/stream.entity";

export type PlatformEvent = PostEvent | VideoEvent;

interface IPlatformEvent {
    readonly channel: ChannelEntity;
    readonly event: Event;
}

export class PostEvent implements IPlatformEvent {
    public readonly event: "post" = "post";
    public readonly channel: ChannelEntity;
    public readonly post: PostEntity<any>;

    constructor(options: Omit<PostEvent, "event">) {
        Object.assign(this, { ...options});
    }
}

export class VideoEvent implements IPlatformEvent {
    public readonly channel: ChannelEntity;
    public readonly event: Event;
    public readonly video: StreamEntity;

    constructor(options: VideoEvent) {
        Object.assign(this, { ...options });
    }
}
