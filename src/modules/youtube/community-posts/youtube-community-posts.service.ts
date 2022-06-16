import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { CommunityPost } from "yt-scraping-utilities";
import { InjectRepository } from "@nestjs/typeorm";
import { CommunityPost as CommunityPostEntitiy} from "./model/community-post.entity";
import { Repository } from "typeorm";
import { YouTubeChannel } from "../model/youtube-channel.entity";
import { In } from "typeorm";
import { CommandBus } from "@nestjs/cqrs";
import { MessageEmbed } from "discord.js";
import { SendNotificationCommand } from "src/modules/discord/commands/send-notification.command";
import { tryFetchPosts } from "../util";

const sleep = async (ms: number) => new Promise<void>(res => setTimeout(res, ms));

@Injectable()
export class YouTubeCommunityPostsService {
    private readonly logger = new Logger(YouTubeCommunityPostsService.name);

    private pointer = 0;
    private hasVisitedAll = false;

    constructor(
        @InjectRepository(YouTubeChannel) private readonly channelRepo: Repository<YouTubeChannel>,
        @InjectRepository(CommunityPostEntitiy) private readonly communityPostRepo: Repository<CommunityPostEntitiy>,
        private readonly commandBus: CommandBus
    ) {}

    @Interval("CHECK_COMMUNITY_POSTS", 1500)
    async checkPosts() {

        // very naive implementation. Gotta do for now.
        const channels = await this.channelRepo.find();

        const channel = channels[this.pointer++];
        if (this.pointer >= channels.length) {
            this.pointer = 0;
            this.hasVisitedAll = true;
        }

        if (!channel) return;

        const posts = await tryFetchPosts(channel.channelId, 3, 500);
        if (typeof posts === "undefined") return this.logger.warn(`Failed getting community posts for ${channel.channelId}`);
        if (posts.length == 0) return;

        const ids = posts.map(post => post.id);
        const knownPosts = await this.communityPostRepo.find({where: {id: In(ids)}});

        for (const post of posts.filter(post => !knownPosts.some(({id}) => post.id == id))) {
            this.logger.debug(`Found new community post for ${channel.channelId}: ${post.id}`);

            await this.communityPostRepo.insert({
                id: post.id
            });

            if (this.hasVisitedAll) {
                const embed = this.postToEmbed(channel, post);

                const event = new SendNotificationCommand({
                    embed,
                    channelId: channel.channelId,
                    eventDescriptor: "youtube:post"
                });

                await this.commandBus.execute(event);
            } 
        }
    }

    private postToEmbed(channel: YouTubeChannel, post: CommunityPost): MessageEmbed {
        // TODO: actually implement

        return new MessageEmbed()
            .setTitle(`${channel.channelName} just posted a new community post!`)
            .setDescription(`Descriptions are hard. soon:tm:\n Debug stuff: ${post.id} | ${post.attachmentType}`)
            .setColor("RED");
    }
}