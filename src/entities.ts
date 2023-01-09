import { StreamDiscordChannelMap } from "./modules/discord/actions/model/stream-thread-map.entity";
import { ActionDescriptor } from "./modules/discord/models/action.entity";
import { GuildSettings } from "./modules/discord/models/settings.entity";
import { ChannelEntity } from "./modules/platforms/models/channel.entity";
import { PostEntity } from "./modules/platforms/models/post.entity";
import { StreamEntity } from "./modules/platforms/models/stream.entity";

export const Entities = [
    GuildSettings,
    ActionDescriptor,
    StreamEntity,
    ChannelEntity,
    PostEntity,
    StreamDiscordChannelMap,
<<<<<<< HEAD
];
=======
];
>>>>>>> 8179ca5 (Some major fixes)
