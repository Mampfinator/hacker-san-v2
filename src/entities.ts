import { ActionDescriptor } from "./modules/discord/models/action.entity";
import { GuildSettings } from "./modules/discord/models/settings.entity";
import { ChannelEntity } from "./modules/platforms/models/channel.entity";
import { PostEntity } from "./modules/platforms/models/post.entity";
import { TwitterSpace } from "./modules/twitter/models/twitter-space.entity";
import { CommunityPost } from "./modules/youtube/community-posts/model/community-post.entity";
import { YouTubeVideo } from "./modules/youtube/model/youtube-video.entity";

export const Entities = [
    GuildSettings,
    CommunityPost,
    YouTubeVideo,
    ActionDescriptor,
    TwitterSpace,
    ChannelEntity,
    PostEntity,
];
