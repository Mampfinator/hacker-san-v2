import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CommunityPost as CommunityPostEntitiy } from "./model/community-post.entity";
import { Repository } from "typeorm";
import { YouTubeChannel } from "../model/youtube-channel.entity";
import { In } from "typeorm";
import { CommandBus } from "@nestjs/cqrs";
import { TriggerActionsCommand } from "src/modules/discord/commands/trigger-actions.command";
import { tryFetchPosts } from "../util";
import { DiscordUtil } from "src/modules/discord/util";
import { CacheChannelInfoCommand } from "../commands/cache-channel-info.command";

@Injectable()
export class YouTubeCommunityPostsService {
    private readonly logger = new Logger(YouTubeCommunityPostsService.name);

    private pointer = 0;

    private started = false;

    constructor(
        @InjectRepository(YouTubeChannel)
        private readonly channelRepo: Repository<YouTubeChannel>,
        @InjectRepository(CommunityPostEntitiy)
        private readonly communityPostRepo: Repository<CommunityPostEntitiy>,
        private readonly commandBus: CommandBus,
    ) {}

    public async checkPosts() {
        // very naive implementation. Gotta do for now.
        const channels = await this.channelRepo.find();

        const channel = channels[this.pointer++];
        if (this.pointer >= channels.length) this.pointer = 0;

        if (!channel) return;

        let channelInfo: {id: string, name: string, avatarUrl: string};

        let { posts, channel: fullChannelInfo } = await tryFetchPosts(
            channel.channelId,
            3,
            500,
        );

        if (!fullChannelInfo) {
            this.logger.debug(`Failed getting channel info from ${channel.channelId}.`);
            const cachedChannel = await this.channelRepo.findOne({where: {channelId: channel.channelId}});

            channelInfo = {
                id: cachedChannel.channelId,
                name: cachedChannel.channelName,
                avatarUrl: cachedChannel.avatarUrl,
            };
        } else {
            channelInfo = {
                id: fullChannelInfo.id,
                name: fullChannelInfo.name,
                avatarUrl: fullChannelInfo.avatarUrl,
            };

            await this.commandBus.execute(new CacheChannelInfoCommand(fullChannelInfo));
        }

        if (typeof posts === "undefined")
            return this.logger.warn(
                `Failed getting community posts for ${channel.channelId}`,
            );
        if (posts.length == 0) return;

        const ids = posts.map(post => post.id);
        const knownPosts = await this.communityPostRepo.find({
            where: { id: In(ids) },
        });

        for (const post of posts.filter(
            post => !knownPosts.some(({ id }) => post.id == id),
        )) {
            this.logger.debug(
                `Found new community post for ${channel.channelId}: ${post.id}`,
            );

            await this.communityPostRepo.insert({
                id: post.id,
            });

            this.logger.debug(
                `Sending community TriggerActionsCommand for community post ${post.id}.`,
            );

            const embed = DiscordUtil.postToEmbed(post, channelInfo);

            const event = new TriggerActionsCommand({
                embed,
                channelId: channel.channelId,
                platform: "youtube",
                event: "post",
                url: `https://www.youtube.com/post/${post.id}`,
            });

            await this.commandBus.execute(event);
        }
    }
}
