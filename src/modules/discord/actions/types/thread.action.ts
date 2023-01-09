import { InjectRepository } from "@nestjs/typeorm";
import { Channel, ChannelType, PublicThreadChannel, TextBasedChannel } from "discord.js";
import { Repository } from "typeorm";
import { DiscordClientService } from "../../client/discord-client.service";
import { ActionDescriptor } from "../../models/action.entity";
import { interpolate } from "../action.util";
import { Action, IActionType } from "../decorators/action";
import { StreamDiscordChannelMap } from "../model/stream-thread-map.entity";
import { ActionExecuteOptions } from "../action.interfaces";

const ORDER = {
    delete: 1,
    create: -1,
};

const DEFAULT_MESSAGE = "${link}";
const DEFAULT_NAME = "${title} - [${time}]";

interface ThreadActionData {
    mode: "delete" | "create";
    name?: string;
    message?: string;
}

@Action({
    type: "thread",
    getGroup: (descriptor: ActionDescriptor) => {
        return ORDER[(descriptor.data as { mode: "delete" | "create" }).mode];
    },
})
export class ThreadAction implements IActionType {
    constructor(
        private readonly client: DiscordClientService,
        @InjectRepository(StreamDiscordChannelMap)
        private readonly streamChannelMaps: Repository<StreamDiscordChannelMap>,
    ) {}

    async execute({ descriptor, payload }: ActionExecuteOptions) {
        const { mode, name, message } = descriptor.data as ThreadActionData;
        const { platform, platformId } = payload.video;

        if (mode === "create") {
            const channel = await this.client.channels.fetch(descriptor.discordChannelId);
            let subchannel: TextBasedChannel;
            switch (channel.type) {
                case ChannelType.GuildCategory:
                    subchannel = await channel.children.create({
                        name: interpolate(name ?? DEFAULT_NAME, { descriptor, payload }),
                        type: ChannelType.GuildText,
                    });
                    await subchannel.send(interpolate(message ?? DEFAULT_MESSAGE, { descriptor, payload }));
                    break;
                case ChannelType.GuildText:
                    subchannel = (await channel.threads.create({
                        name: interpolate(name ?? DEFAULT_NAME, { descriptor, payload }),
                        startMessage: interpolate(message ?? DEFAULT_MESSAGE, { descriptor, payload }),
                        type: ChannelType.PublicThread,
                    })) as PublicThreadChannel;
                    break;
                case ChannelType.GuildForum:
                    subchannel = (await channel.threads.create({
                        name: interpolate(name ?? DEFAULT_NAME, { descriptor, payload }),
                        message: { content: interpolate(message ?? DEFAULT_MESSAGE, { descriptor, payload }) },
                    })) as PublicThreadChannel;
                    break;
            }

            await this.streamChannelMaps.insert({
                channelId: subchannel.id,
                platform,
                platformId,
            });
        } else {
            const channels = await this.streamChannelMaps.find({
                where: {
                    platform,
                    platformId,
                },
            });
        }
    }
}
