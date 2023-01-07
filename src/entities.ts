import { StreamDiscordChannelMap } from "./modules/discord/actions/model/stream-thread-map.entity";
import { ActionDescriptor } from "./modules/discord/models/action.entity";
import { GuildSettings } from "./modules/discord/models/settings.entity";
import { ChannelEntity } from "./modules/platforms/models/channel.entity";
import { PostEntity } from "./modules/platforms/models/post.entity";
import { StreamEntity } from "./modules/platforms/models/stream.entity";

<<<<<<< HEAD
export const Entities = [
    GuildSettings,
    ActionDescriptor,
    StreamEntity,
    ChannelEntity,
    PostEntity,
    StreamDiscordChannelMap,
];
=======
export const Entities = [GuildSettings, ActionDescriptor, StreamEntity, ChannelEntity, PostEntity];
>>>>>>> c4f6a92 (Removed YouTubeVideo entity)
