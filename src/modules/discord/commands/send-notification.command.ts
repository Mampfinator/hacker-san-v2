import { MessageEmbed } from "discord.js";
import {ICommand} from "@nestjs/cqrs";

export type Platform = "youtube" | "twitter";
export type Event = "live" | "upload" | "offline" | "upcoming"

type EventDescriptor = `${Platform}:${Event}`;

interface EventInfo {
    channelId: string;
    eventDescriptor: string;
    url?: string;
    embed?: MessageEmbed;
}

export class SendNotificationCommand implements ICommand{
    constructor(
        public readonly eventInfo: EventInfo
    ){}
}