import { InjectRepository } from "@nestjs/typeorm";
import { ChannelType } from "discord.js";
import { Repository, ArrayContains  } from "typeorm";
import { DiscordClientService } from "../../../discord-client.service";
import { ActionExecuteOptions } from "../../action.interfaces";
import { interpolate } from "../../action.util";
import { Action, IActionType } from "../../decorators/action";
import { TempChannelMap } from "./temp-channel-map.entity";


@Action({type: "thread", getGroup: () => -1})
export class ThreadAction implements IActionType {
    constructor(
        private readonly client: DiscordClientService,
        @InjectRepository(TempChannelMap) private readonly tempChannelMaps: Repository<TempChannelMap>
    ) {}
    
    async execute(options: ActionExecuteOptions) {
        const {payload: {video}, descriptor} = options;
        if (!video) return;

        const discordChannel = await this.client.channels.fetch(descriptor.discordChannelId);
        if (discordChannel.type !== ChannelType.GuildText) return;

        const {platform, platformId} = video;
        const tempChannelMap = await this.tempChannelMaps.findOne({where: {platform, platformId}});
        if (!tempChannelMap) throw new Error(`Expected TempChannelMap for ${platform}:${platformId} to exist.`);

        const thread = await discordChannel.threads.create({
            name: interpolate(descriptor.data.name ?? "[{date}] {title}", options),
            type: ChannelType.PublicThread,
        });

        tempChannelMap.channels.add(thread.id);
    }
}