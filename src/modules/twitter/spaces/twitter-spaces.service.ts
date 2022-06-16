import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus } from "@nestjs/cqrs";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { MessageEmbed } from "discord.js";
import { TwitterConfig } from "src/modules/config/config";
import { SendNotificationCommand } from "src/modules/discord/commands/send-notification.command";
import { TwitterApi, SpaceV2, UserV2 } from "twitter-api-v2";
import { In, Repository } from "typeorm";
import { TwitterSpace, TwitterSpaceStatus } from "../models/twitter-space.entity";
import { TwitterUser } from "../models/twitter-user.entity";


@Injectable()
export class TwitterSpacesService {
    private readonly apiClient: TwitterApi;
    
    constructor(
        private readonly config: ConfigService,
        private readonly commandBus: CommandBus,
        @InjectRepository(TwitterUser) private readonly usersRepo: Repository<TwitterUser>,
        @InjectRepository(TwitterSpace) private readonly spacesRepo: Repository<TwitterSpace>
    ) {
        const twitterConfig = config.getOrThrow<TwitterConfig>("TWITTER");
        this.apiClient = new TwitterApi(twitterConfig.token);
    }

    @Interval(20000)
    public async syncTwitterSpaces() {
        const users = await this.usersRepo.find();
        
        const {data: apiSpaces, includes} = await this.apiClient.v2.spacesByCreators(
            users.map(user => user.id),
            {
                expansions: ["creator_id"]
            }
        );

        const dbSpaces = await this.spacesRepo.find({where: {status: In(["live", "scheduled"])}});

        const spaces = new Map<string, {db?: TwitterSpace, api?: SpaceV2, author?: UserV2}>();

        for (const space of dbSpaces) {
            spaces.set(space.id, {db: space});
        }

        for (const space of apiSpaces) {
            if (!spaces.has(space.id)) spaces.set(space.id, {api: space});
            
            const lookup = spaces.get(space.id);
            lookup.api = space;
            lookup.author = includes.users.find(user => user.id === space.creator_id);
        }


        for (let [id, {api, db, author}] of spaces) {
            if (api?.state === db?.status) continue;

            if (!db) {
                db = await this.spacesRepo.save({
                    id,
                    channelId: api.creator_id,
                    status: api.state
                });
            }
            
            let newStatus: TwitterSpaceStatus;
            if (!api) newStatus = "offline";
            else newStatus = api.state;

            this.generateNotif(newStatus, id, api, author);
        }
    }

    private async generateNotif(newStatus: TwitterSpaceStatus, id: string, space?: SpaceV2, author?: UserV2): Promise<void> {
        const url = `https://twitter.com/i/spaces/${space.id}`;

        const userName =  author.name ?? (await this.usersRepo.findOne({where: {id: space.creator_id}})).name;

        let eventText: string;
        switch(space?.state) {
            case "live":
                eventText = "just went live!"; break;
            case "scheduled":
                eventText = "just scheduled a new Space!"; break;
            case undefined:
                eventText = "just went offline!"; break;
        }

        const embed = new MessageEmbed()
            .setTitle(`${userName} ${eventText}}`)
            .setColor("BLUE")
            .addField("Link", `[Space](${url})`)
            .setThumbnail(author.profile_image_url);
        
        this.commandBus.execute(new SendNotificationCommand({
            eventDescriptor: `twitter:${newStatus}`,
            channelId: space.creator_id,
            url,
            embed
        }));
    }
}