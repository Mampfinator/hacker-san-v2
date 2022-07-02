import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { YouTubeChannel } from "../model/youtube-channel.entity";
import { CacheChannelInfoCommand } from "./cache-channel-info.command";

@CommandHandler(CacheChannelInfoCommand)
export class CacheChannelInfoHandler
    implements ICommandHandler<CacheChannelInfoCommand>
{
    constructor(
        @InjectRepository(YouTubeChannel)
        private readonly channelRepo: Repository<YouTubeChannel>,
    ) {}

    async execute({ channelInfo }: CacheChannelInfoCommand): Promise<any> {
        const { id, name, avatarUrl } = channelInfo;

        if (!id) throw new TypeError(`channelInfo.id is required.`);

        await this.channelRepo.save(
            this.channelRepo.create({
                channelId: id,
                channelName: name,
                avatarUrl,
            }),
        );
    }
}
