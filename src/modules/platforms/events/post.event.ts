import { IEvent } from "@nestjs/cqrs";
import { ChannelEntity } from "../models/channel.entity";
import { PostEntity } from "../models/post.entity";

export class PostEvent implements IEvent {
    public channel: ChannelEntity;
    public post: PostEntity;
}
