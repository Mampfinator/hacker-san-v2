import { Injectable, Logger } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { MessageEmbed } from "discord.js";
import { TriggerActionsCommand } from "src/modules/discord/commands/trigger-actions.command";
import { Event } from "src/modules/discord/models/action.entity";
import { SpaceV2, TSpaceV2State } from "twitter-api-v2";
import { In, Repository } from "typeorm";
import {
    TwitterSpace,
    TwitterSpaceStatus,
} from "../models/twitter-space.entity";
import { TwitterUser } from "../models/twitter-user.entity";
import { TwitterApiService } from "../twitter-api.service";

@Injectable()
export class TwitterSpacesService {
    private readonly logger = new Logger(TwitterSpacesService.name);
    //private readonly apiClient: TwitterApi;
    //private readonly token: string;

    constructor(
        private readonly commandBus: CommandBus,
        private readonly apiClient: TwitterApiService,
        @InjectRepository(TwitterUser)
        private readonly usersRepo: Repository<TwitterUser>,
        @InjectRepository(TwitterSpace)
        private readonly spacesRepo: Repository<TwitterSpace>,
    ) {}

    @Interval(5000)
    public async syncTwitterSpaces() {
        const users = await this.usersRepo.find();
        if (users.length == 0) return;

        try {
            const ids = users.map(u => u.id);
            const response = await this.apiClient.v2.spacesByCreators(ids, {
                "space.fields": [
                    "creator_id",
                    "scheduled_start",
                    "started_at",
                    "title",
                ],
            });

            if (!response) return;

            const apiSpaces = response.data ?? [];
            const dbSpaces = await this.spacesRepo.find({
                where: { status: In(["live", "scheduled"]) },
            });

            const spaces = new Map<
                string,
                { db?: TwitterSpace; api?: SpaceV2 }
            >();

            for (const space of dbSpaces) {
                spaces.set(space.id, { db: space });
            }

            for (const space of apiSpaces) {
                if (!spaces.has(space.id)) spaces.set(space.id, { api: space });
                else {
                    const lookup = spaces.get(space.id);
                    lookup.api = space;
                }
            }

            // eslint-disable-next-line prefer-const
            for (let [id, { api, db }] of spaces) {
                if (api?.state === db?.status) continue;

                if (!db) {
                    let scheduledStart: number | undefined = Number(
                        api.scheduled_start,
                    );
                    if (isNaN(scheduledStart)) scheduledStart = undefined;

                    db = await this.spacesRepo.save({
                        id,
                        channelId: api.creator_id,
                        status: api.state,
                        title: api.title,
                        scheduledStart: scheduledStart,
                    });
                }

                let newStatus: TwitterSpaceStatus;
                if (!api) newStatus = "offline";
                else newStatus = api.state;

                await this.spacesRepo.save({
                    id,
                    status: newStatus,
                });

                this.generateNotif(id, db, api);
            }
        } catch (error) {
            this.logger.error("Error while fetching spaces.");
            this.logger.error(error);
        }
    }

    private async generateNotif(
        id: string,
        dbSpace?: TwitterSpace,
        space?: SpaceV2,
    ): Promise<void> {
        const url = `https://twitter.com/i/spaces/${id}`;

        const userId = dbSpace?.channelId ?? space?.creator_id;

        const author = await this.apiClient.fetchUserById(userId, false);

        const userName = author?.name;

        let eventText: string;
        switch (space?.state) {
            case "live":
                eventText = "just went live with a Space!";
                break;
            case "scheduled":
                eventText = "just scheduled a new Space!";
                break;
            case undefined:
                eventText = "just ended their Space!";
                break;
        }

        const embed = new MessageEmbed()
            .setAuthor({
                name: `${author.name} (@${author.username})`,
                iconURL: author.profile_image_url,
            })
            .setTitle(`${userName} ${eventText}`)
            .setColor("BLUE")
            .addField("Title", `\`\`\`\n${space?.title ?? "No title"}\`\`\``)
            .addField("Link", `[Join here](${url})`)
            .setThumbnail(author.profile_image_url);

        if (space?.started_at) {
            const startedAt = Math.floor(Date.parse(space.started_at) / 1000);
            embed.addField(
                "Started at",
                `<t:${startedAt}:T> (<t:${startedAt}:R>)`,
            );
        }

        if (space?.scheduled_start) {
            const scheduledFor = Math.floor(
                Number(Date.parse(space.scheduled_start)) / 1000,
            );
            embed.addField(
                "Scheduled for",
                `<t:${scheduledFor}:T> (<t:${scheduledFor}:R>)`,
            );
        }

        this.commandBus.execute(
            new TriggerActionsCommand({
                platform: "twitter",
                event: this.stateToStatus(space?.state),
                channelId: userId,
                url,
                embed,
            }),
        );
    }

    private stateToStatus(state?: TSpaceV2State): Event {
        return (
            {
                live: "live",
                scheduled: "upcoming",
                undefined: "offline",
            } as Record<TSpaceV2State | undefined, Event>
        )[state];
    }
}
