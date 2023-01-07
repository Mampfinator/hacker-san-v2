import { ActionDescriptor } from "./modules/discord/models/action.entity";
import { GuildSettings } from "./modules/discord/models/settings.entity";
import { ChannelEntity } from "./modules/platforms/models/channel.entity";
import { PostEntity } from "./modules/platforms/models/post.entity";
import { StreamEntity } from "./modules/platforms/models/stream.entity";
import { TwitterSpace } from "./modules/twitter/models/twitter-space.entity";
import { YouTubeVideo } from "./modules/youtube/model/youtube-video.entity";

export const Entities = [
    GuildSettings,
    YouTubeVideo,
    ActionDescriptor,
    StreamEntity,
    ChannelEntity,
    PostEntity,
];
