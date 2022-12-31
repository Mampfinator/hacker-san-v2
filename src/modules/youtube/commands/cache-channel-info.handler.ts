import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CacheChannelInfoCommand } from "./cache-channel-info.command";

// TODO: fix
@CommandHandler(CacheChannelInfoCommand)
export class CacheChannelInfoHandler
    implements ICommandHandler<CacheChannelInfoCommand>
{
    constructor() {}

    async execute({ channelInfo }: CacheChannelInfoCommand): Promise<any> {
        const { id, name, avatarUrl } = channelInfo;

        if (!id) throw new TypeError(`channelInfo.id is required.`);
    }
}
