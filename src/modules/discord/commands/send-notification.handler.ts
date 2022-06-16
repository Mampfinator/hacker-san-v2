import { Logger } from "@nestjs/common";
import { CommandHandler, EventsHandler, ICommandHandler, IEventHandler } from "@nestjs/cqrs";
import { GuildTextBasedChannel } from "discord.js";
import { DiscordClientService } from "../client/discord-client.service";
import { SendNotificationCommand } from "./send-notification.command";

import type {Platform, Event} from "./send-notification.command";

@CommandHandler(SendNotificationCommand)
export class SendNotificationHandler implements ICommandHandler<SendNotificationCommand> {
    private readonly logger = new Logger(SendNotificationHandler.name);
    
    constructor(
        private readonly client: DiscordClientService
    ) {}
    
    async execute({eventInfo}: SendNotificationCommand) {
        // TODO: actually implement
        /*
            - add filters to eventInfo so senders can specify (probably just platform & channelId, I guess?)
            - actually implement Subscriptions
        */

        const [platform, event] = eventInfo.eventDescriptor.split(":") as [Platform, Event];

        

        const guild = await this.client.guilds.fetch("826407842558115880");
        const channel = await guild.channels.fetch("961571246401810442") as GuildTextBasedChannel; 

        if (eventInfo.embed) {
            await channel.send({
                embeds: [eventInfo.embed],
                content: eventInfo.url
            })
        } else {
            await channel.send(eventInfo.url);
        }
    }
}