import { Injectable, Logger } from "@nestjs/common";
import { CommunityPost as CommunityPostEntitiy } from "./model/community-post.entity";
import { Repository } from "typeorm";
import { In } from "typeorm";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { TriggerActionsCommand } from "../../../modules/discord/commands/trigger-actions.command";
import { DiscordUtil } from "../../../modules/discord/util";
import { CacheChannelInfoCommand } from "../commands/cache-channel-info.command";
import { FetchPostsCommand } from "./commands/fetch-posts.command";
import { InjectRepository } from "@nestjs/typeorm";
import { ChannelEntity } from "../../platforms/models/channel.entity";
import { ChannelQuery } from "../../platforms/queries";

@Injectable()
export class YouTubeCommunityPostsService {
    private readonly logger = new Logger(YouTubeCommunityPostsService.name);

    private pointer = 0;
    private started = false;

    constructor(
        @InjectRepository(CommunityPostEntitiy)
        private readonly communityPostRepo: Repository<CommunityPostEntitiy>,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    public async checkPosts() {
        // TODO: fix
        const channels = await this.queryBus.execute(ChannelQuery.forPlatform("youtube"));

        const channel = channels[this.pointer++];
        if (this.pointer >= channels.length) this.pointer = 0;

        if (!channel) return;

        let channelInfo: { id: string; name: string; avatarUrl: string };

        const {
            posts,
            channel: fullChannelInfo,
            errors,
        } = await this.commandBus.execute(
            new FetchPostsCommand({
                channelId: channel.platformId,
                includeChannelInfo: true,
            }),
        );

        if (!fullChannelInfo) {
            this.logger.debug(
                `Failed getting channel info from ${channel.platformId}.`,
            );

            // TODO: fix
        } else {
            channelInfo = {
                id: fullChannelInfo.id,
                name: fullChannelInfo.name,
                avatarUrl: fullChannelInfo.avatarUrl,
            };

            await this.commandBus.execute(
                new CacheChannelInfoCommand(fullChannelInfo),
            );
        }

        if (typeof posts === "undefined") {
            this.logger.warn(
                `Failed getting community posts for ${channel.platformId}`,
            );
            for (const error of errors) {
                this.logger.error(error);
            }
            return;
        }
        if (posts.length == 0) return;

        const ids = posts.map(post => post.id);
        const knownPosts = await this.communityPostRepo.find({
            where: { id: In(ids) },
        });

        for (const post of posts.filter(
            post => !knownPosts.some(({ id }) => post.id == id),
        )) {
            this.logger.debug(
                `Found new community post for ${channel.platformId}: ${post.id}`,
            );

            await this.communityPostRepo.insert({
                id: post.id,
            });

            const embed = DiscordUtil.postToEmbed(post, channelInfo);

            const event = new TriggerActionsCommand({
                embed,
                channelId: channel.platformId,
                platform: "youtube",
                event: "post",
                url: `https://www.youtube.com/post/${post.id}`,
            });

            await this.commandBus.execute(event);
        }
    }
}
