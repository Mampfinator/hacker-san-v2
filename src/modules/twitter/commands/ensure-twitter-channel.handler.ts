import { Logger } from "@nestjs/common";
import { CommandHandler, IInferredCommandHandler } from "@nestjs/cqrs";
import { ValidateChannelResult } from "../../../modules/platforms/commands/ensure-channel.handler";
import { UserV2 } from "twitter-api-v2";
import { TwitterApiService } from "../twitter-api.service";
import { EnsureTwitterChannelCommand } from "./ensure-twitter-channel.command";
import { ChannelEntity } from "../../platforms/models/channel.entity";

@CommandHandler(EnsureTwitterChannelCommand)
export class EnsureTwitterChannelHandler implements IInferredCommandHandler<EnsureTwitterChannelCommand> {
    private readonly logger = new Logger(EnsureTwitterChannelHandler.name);

    constructor(
        // private readonly commandBus: CommandBus,
        private readonly apiService: TwitterApiService,
    ) {}

    async execute({ channelId }: EnsureTwitterChannelCommand): Promise<ValidateChannelResult> {
        channelId = channelId.trim();

        // TODO: check if channel exists via channel query.

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

        const { id: platformId, username: userName, name, profile_image_url: avatarUrl } = user;

        const channel: Omit<ChannelEntity, "id"> = {
            platform: "twitter",
            name,
            userName,
            platformId,
            avatarUrl,
        };

        // TODO: sync space status

        return { success: true, channel };
    }
}
