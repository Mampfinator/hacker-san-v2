import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { EnsureChannelResult } from "../../../modules/platforms/commands/ensure-channel.handler";
import { UserV2 } from "twitter-api-v2";
import { Repository } from "typeorm";
import { TwitterUser } from "../models/twitter-user.entity";
import { TwitterApiService } from "../twitter-api.service";
import { EnsureTwitterChannelCommand } from "./ensure-twitter-channel.command";

@CommandHandler(EnsureTwitterChannelCommand)
export class EnsureTwitterChannelHandler implements ICommandHandler<EnsureTwitterChannelCommand> {
    private readonly logger = new Logger(EnsureTwitterChannelHandler.name);

    constructor(
        @InjectRepository(TwitterUser)
        private readonly userRepo: Repository<TwitterUser>,
        private readonly apiService: TwitterApiService,
    ) {}

    async execute({ channelId }: EnsureTwitterChannelCommand): Promise<EnsureChannelResult> {
        channelId = channelId.trim();

        try {
            const exists = await this.userRepo.findOne({
                where: [{ id: channelId }, { name: channelId.replace("@", "") }],
            });
            if (!exists) {
                let user: UserV2;
                switch (true) {
                    case /^[0-9]+$/.test(channelId):
                        user = await this.apiService.fetchUserById(channelId).catch();
                        break;
                    case channelId.startsWith("@"):
                        user = await this.apiService.fetchUserByName(channelId.replace("@", "")).catch();
                        break;
                    default:
                        this.logger.debug(`Got invalid channelId: ${channelId}.`);
                }

                if (!user) return { success: false };

                const { id, username } = user;

                await this.userRepo.save({
                    id,
                    name: username,
                });

                // TODO: sync space status

                return { success: true, channelId: id, name: username };
            }

            return { success: true, channelId: exists.id, name: exists.name };
        } catch (error) {
            return { error, success: false };
        }
    }
}
