import { Event } from "../../../constants";
import { ChannelEntity } from "../../platforms/models/channel.entity";
import { PostEntity } from "../../platforms/models/post.entity";
import { StreamEntity } from "../../platforms/models/stream.entity";
import { ActionDescriptor } from "../models/action.entity";

export interface ActionExecuteOptions {
    descriptor: ActionDescriptor;
    payload: IActionPayload<any>;
}

export interface IActionPayload<TEvent extends Event> {
    event: TEvent;
    post: TEvent extends "post" ? PostEntity<any> : never;
    video: TEvent extends Exclude<Event, "post"> ? StreamEntity : never;
    channel: ChannelEntity;
}
