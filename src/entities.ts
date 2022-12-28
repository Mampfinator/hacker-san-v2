import { ActionDescriptor } from "./modules/discord/models/action.entity";
import { GuildSettings } from "./modules/discord/models/settings.entity";
import { ChannelEntity } from "./modules/platforms/models/channel.entity";
import { TwitterSpace } from "./modules/twitter/models/twitter-space.entity";
import { TwitterUser } from "./modules/twitter/models/twitter-user.entity";
import { CommunityPost } from "./modules/youtube/community-posts/model/community-post.entity";
import { YouTubeChannel } from "./modules/youtube/model/youtube-channel.entity";
import { YouTubeVideo } from "./modules/youtube/model/youtube-video.entity";

export const Entities = [
    GuildSettings,
    YouTubeChannel,
    CommunityPost,
    YouTubeVideo,
    ActionDescriptor,
    TwitterUser,
    TwitterSpace,
    ChannelEntity,
];
