import { Logger } from "@nestjs/common";
import { CommandHandler, IInferredCommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { ChannelType } from "discord.js";
import { Repository } from "typeorm";
import { DiscordClientService } from "../../../../discord-client.service";
import { ignoreDiscordAPIErrors } from "../../../../util";
import { TempChannelMap } from "../temp-channel-map.entity";
import { RemoveMapCommand } from "./remove-map.command";

@CommandHandler(RemoveMapCommand)
export class RemoveMapHandler implements IInferredCommandHandler<RemoveMapCommand> {
    private readonly logger = new Logger(RemoveMapHandler.name);
    constructor(
        @InjectRepository(TempChannelMap) private readonly tempChannelMaps: Repository<TempChannelMap>,
        private readonly client: DiscordClientService,
    ) {}

    async execute({video: {platform, platformId}}: RemoveMapCommand): Promise<void> {
        const channelMap = await this.tempChannelMaps.findOne({where: {platform, platformId}});
        if (!channelMap) return;
        
        for (const channelId of channelMap.channels) {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) continue;
            try {
                if (channel.type === ChannelType.PublicThread || channel.type === ChannelType.PrivateThread) {
                    await channel.setArchived(true, "Temp stream chat closed.");
                } else if (channel.type === ChannelType.GuildText) {
                    await channel.permissionOverwrites.create(channel.guild.roles.everyone, {SendMessages: false}, {reason: "Temp stream chat closed."});
                }
            } catch (error) {
                ignoreDiscordAPIErrors(error).catch(error => {
                    this.logger.error(error);
                });
            }
        }
    }
}