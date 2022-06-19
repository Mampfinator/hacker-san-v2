import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { EnsureChannelResult } from "src/modules/shared/commands/ensure-channel.handler";
import { Repository } from "typeorm";
import { TwitterUser } from "../models/twitter-user.entity";
import { EnsureTwitterChannelCommand } from "./ensure-twitter-channel.command";

@CommandHandler(EnsureTwitterChannelCommand)
export class EnsureTwitterChannelHandler
    implements ICommandHandler<EnsureTwitterChannelCommand>
{
    constructor(
        @InjectRepository(TwitterUser)
        private readonly userRepo: Repository<TwitterUser>,
    ) {}

    async execute({
        channelId,
    }: EnsureTwitterChannelCommand): Promise<EnsureChannelResult> {
        try {
            const exists = await this.userRepo.findOne({
                where: { id: channelId },
            });
            if (!exists) {
                // TODO: verify ID here

                await this.userRepo.save({
                    id: channelId,
                });

                return { success: true };
            }

            return { success: true };
        } catch (error) {
            return { error, success: false };
        }
    }
}
