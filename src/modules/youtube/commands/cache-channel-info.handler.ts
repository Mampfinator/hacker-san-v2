import { CommandHandler, ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { UpdateChannelQuery } from "../../platforms/queries/channel/update-channel.query";
import { CacheChannelInfoCommand } from "./cache-channel-info.command";

// TODO: fix
@CommandHandler(CacheChannelInfoCommand)
export class CacheChannelInfoHandler implements ICommandHandler<CacheChannelInfoCommand> {
    constructor(private readonly queryBus: QueryBus) {}

    async execute({ channelInfo }: CacheChannelInfoCommand): Promise<any> {
        const { id, name, avatarUrl } = channelInfo;

        await this.queryBus.execute(
            new UpdateChannelQuery(
                { platform: "youtube", platformId: id },
                {
                    name,
                    avatarUrl,
                },
            ),
        );
    }
}
