import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus } from "@nestjs/cqrs";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { AxiosError } from "axios";
import { MessageEmbed } from "discord.js";
import { StatsBase } from "fs";
import { datacatalog } from "googleapis/build/src/apis/datacatalog";
import { TwitterConfig } from "src/modules/config/config";
import { TriggerActionsCommand } from "src/modules/discord/commands/trigger-actions.command";
import { Event } from "src/modules/discord/models/action.entity";
import { TwitterApi, SpaceV2, UserV2, TSpaceV2State } from "twitter-api-v2";
import { In, Repository } from "typeorm";
import { TwitterSpace, TwitterSpaceStatus } from "../models/twitter-space.entity";
import { TwitterUser } from "../models/twitter-user.entity";

@Injectable()
export class TwitterSpacesService {
    private readonly logger = new Logger(TwitterSpacesService.name);
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

    @Interval(5000)
    public async syncTwitterSpaces() {
        this.logger

        const users = await this.usersRepo.find();
        if (users.length == 0) return;

        const ids = users.map(u => u.id);
        this.logger.debug(`Searching for Spaces by ${ids}.`);

        try {

            const response = await this.apiClient.v2.spacesByCreators(
                ids,
                {
                    expansions: [
                        "creator_id",
                    ],
                    "space.fields": [
                        "id", 
                        "creator_id", 
                        "started_at", 
                        "scheduled_start", 
                        "title", 
                        "is_ticketed", 
                        "state"
                    ],
                }
            );

            const {data: apiSpaces, includes} = response;
            if (!apiSpaces || apiSpaces.length == 0) return this.logger.debug("No spaces found.");
            this.logger.debug(`Found spaces: ${apiSpaces.length}`);

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
        } catch (error) {
            this.logger.error("Error while fetching spaces.");
            this.logger.error(error);
        }
    }

    private async generateNotif(newStatus: TwitterSpaceStatus, id: string, space?: SpaceV2, author?: UserV2): Promise<void> {
        const url = `https://twitter.com/i/spaces/${id}`;

        const userName =  author?.name;

        let eventText: string;
        switch(space?.state) {
            case "live":
                eventText = "just went live!"; break;
            case "scheduled":
                eventText = "just scheduled a new Space!"; break;
            case undefined:
                eventText = "just went offline!"; break;
        }

        console.log(author);

        const embed = new MessageEmbed()
            .setTitle(`${userName} ${eventText}`)
            .setColor("BLUE")
            .addField("Link", `[Space](${url})`)
            .setThumbnail(author.profile_image_url);
        
        this.commandBus.execute(new TriggerActionsCommand({
            platform: "twitter",
            event: this.stateToStatus(space?.state),
            channelId: space.creator_id,
            url,
            embed
        }));
    }

    private stateToStatus(state?: TSpaceV2State): Event {
        return ({
            "live": "live",
            "scheduled": "upcoming",
            undefined: "offline"
        } as Record<TSpaceV2State | undefined, Event>)[state];
    }
}