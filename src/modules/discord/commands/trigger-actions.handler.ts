import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DiscordClientService } from "../client/discord-client.service";
import { TriggerActionsCommand } from "./trigger-actions.command";
import { Action } from "../models/action.entity";
import { Repository } from "typeorm";
import { IActionType } from "../actions/action";
import { DiscordUtil, ignoreDiscordAPIErrors } from "../util";
import { DiscordRESTService } from "../discord-rest.service";
import { NonThreadGuildBasedChannel, ThreadChannel } from "discord.js";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectActions } from "../actions/actions-helper";

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
        private readonly rest: DiscordRESTService,
        @InjectRepository(Action)
        private readonly actionsRepo: Repository<Action>,
        @InjectActions()
        private readonly actions: Map<string, IActionType & { type: string }>,
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
            this.logger.debug(
                `Executing action ${action.id} (${action.type}).`,
            );

            const actionType = this.actions.get(action.type);
            if (!actionType) {
                this.logger.error(
                    `Could not find @ActionType for ${action.type}.`,
                );
                continue;
            }

            // fetching channels apparently sometimes has a chance to never return (or throw) when the channel doesn't exist.
            const channel = await new Promise<
                ThreadChannel | NonThreadGuildBasedChannel
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
                await actionType.execute({
                    channel,
                    command,
                    data: action.data,
                });
            } catch (error) {
                this.logger.warn(error);
                ignoreDiscordAPIErrors(error);
            }
        }

        this.logger.debug("Finished.");
    }
}
