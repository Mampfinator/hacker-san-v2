import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DiscordClientService } from "../client/discord-client.service";
import { TriggerActionsCommand } from "./trigger-actions.command";
import { ActionDescriptor } from "../models/action.entity";
import { Repository } from "typeorm";
import { IActionType } from "../actions/action";
import { DiscordUtil, ignoreDiscordAPIErrors } from "../util";
import { DiscordRESTService } from "../discord-rest.service";
import { Channel, NonThreadGuildBasedChannel, ThreadChannel } from "discord.js";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectActions } from "../actions/actions-helper";
import { ActionOrchestrator } from "../actions/action.orchestrator";

class ChannelFetchHungError extends Error {
    constructor() {
        super("Channel fetch hung.");
    }
}

@CommandHandler(TriggerActionsCommand)
export class TriggerActionsHandler
    implements ICommandHandler<TriggerActionsCommand>
{
    private readonly logger = new Logger(TriggerActionsHandler.name);

    constructor(
        private readonly client: DiscordClientService,
        @InjectRepository(ActionDescriptor)
        private readonly actionsRepo: Repository<ActionDescriptor>,
        private readonly actionOrchestrator: ActionOrchestrator,
    ) {}

    async execute(command: TriggerActionsCommand) {
        const { platform, event, channelId } = command.options;

        const actions = await this.actionsRepo.find({
            where: {
                platform,
                channelId,
                onEvent: event,
            },
        });

        this.logger.debug(
            `Found ${actions.length} actions for ${channelId} (${platform}, ${event}).`,
        );

        for (const action of actions) {
            const channel = await new Promise<
                Channel
            >(async (res, rej) => {
                let resolved = false;
                setTimeout(() => {
                    if (!resolved) rej(new ChannelFetchHungError());
                }, 1000);

                const channel = await DiscordUtil.fetchChannelOrThread(
                    action,
                    this.client,
                );
                resolved = true;
                res(channel);
            }).catch(error => {
                if (error instanceof ChannelFetchHungError) {
                    return this.logger.warn(
                        `Channel fetch hung for action ${action.id} (${action.type}).`,
                    );
                }

                throw error;
            });

            if (!channel) continue;

            this.logger.debug(`Executing action in ${channel.id}.`);

            try {
                await this.actionOrchestrator.execute(
                    command,
                    action,
                    channel
                );
            } catch (error) {
                this.logger.warn(error);
                ignoreDiscordAPIErrors(error);
            }
        }

        this.logger.debug("Finished.");
    }
}
