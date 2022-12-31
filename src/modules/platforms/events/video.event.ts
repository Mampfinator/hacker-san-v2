import { IEvent } from "@nestjs/cqrs";
import { ChannelEntity } from "../models/channel.entity";
import { StreamEntity } from "../models/stream.entity";

export class VideoEvent implements IEvent {
    public channel: ChannelEntity;
    public video: StreamEntity;
}
