import { Injectable, Logger } from "@nestjs/common";
import { Repository } from "typeorm";
import { In } from "typeorm";
import { CommandBus, EventBus, QueryBus } from "@nestjs/cqrs";
import { CacheChannelInfoCommand } from "../commands/cache-channel-info.command";
import { FetchPostsCommand } from "./commands/fetch-posts.command";
import { InjectRepository } from "@nestjs/typeorm";
import { FindChannelQuery } from "../../platforms/queries";
import { PostEvent } from "../../platforms/events/platform-event";
import { CommunityPost, ImageCommunityPost, PollCommunityPost } from "yt-scraping-utilities";
import { CommunityPostEntity } from "../../platforms/models/post.entity";
import { FindPostsQuery } from "../../platforms/queries/post/find-posts.query";
import { InsertPostsQuery } from "../../platforms/queries/post/insert-posts.query";
@Injectable()
export class YouTubeCommunityPostsService {
    private readonly logger = new Logger(YouTubeCommunityPostsService.name);

    private pointer = 0;
    private started = false;

    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
    ) {}

    public async checkPosts() {
        const channels = await this.queryBus.execute(new FindChannelQuery().forPlatform("youtube"));

        const channel = channels[this.pointer++];
        if (this.pointer >= channels.length) this.pointer = 0;

        if (!channel) return;

        const { posts: rawPosts, channel: fullChannelInfo } = await this.commandBus.execute(
            new FetchPostsCommand({
                channelId: channel.platformId,
                includeChannelInfo: true,
            }),
        );

        if (fullChannelInfo) {
            await this.commandBus.execute(new CacheChannelInfoCommand(fullChannelInfo));
        }

        if (typeof rawPosts === "undefined") {
            this.logger.warn(`Failed getting community posts for ${channel.platformId}`);
        }
        if (rawPosts.length == 0) return;

        const knownPosts = new Set(
            (
                await this.queryBus.execute(
                    new FindPostsQuery().where({ platformId: In(rawPosts.map(post => post.id)) }),
                )
            ).map(post => post.id),
        );

        const posts = rawPosts.filter(post => !knownPosts.has(post.id)).map(post => this.postToEntity(post));

        await this.queryBus.execute(new InsertPostsQuery(posts));

        for (const post of posts) {
            await this.eventBus.publish(
                new PostEvent({
                    channel,
                    post,
                }),
            );
        }
    }

    public postToEntity(post: CommunityPost): CommunityPostEntity {
        const entity: CommunityPostEntity = {
            platform: "youtube",
            platformId: post.id,
            content: post.content,
            images: (post as ImageCommunityPost).images,
            poll: (post as PollCommunityPost).choices?.map(choice => choice.text),
            data: {
                pollImages: (post as PollCommunityPost).choices?.map(choice => choice.imageUrl),
            },
        };

        return entity;
    }
}
