import { Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DiscordClientService } from "../client/discord-client.service";
import { TriggerActionsCommand } from "./trigger-actions.command";
import { InjectRepository } from "@nestjs/typeorm";
import { Action } from "../models/action.entity";
import { Repository } from "typeorm";
import { IActionType } from "../actions/action";
import { InjectActions } from "../actions/actions-helper";
import { DiscordUtil } from "../util";

@CommandHandler(TriggerActionsCommand)
export class TriggerActionsHandler implements ICommandHandler<TriggerActionsCommand> {
    private readonly logger = new Logger(TriggerActionsHandler.name);
    
    constructor(
        private readonly client: DiscordClientService,
        @InjectRepository(Action) private readonly actionsRepo: Repository<Action>, 
        @InjectActions() private readonly actions: Map<string, IActionType & {type: String}>
    ) {}
    
    async execute(command: TriggerActionsCommand) {
        this.logger.debug(`Got TriggerActionsCommand for ${command.options.channelId} (${command.options.platform}, ${command.options.event})`);

        const {
            platform,
            event,
            url,
            channelId,
            embed
        } = command.options;
        

        const actions = await this.actionsRepo.find({
            where: {
                platform,
                channelId, 
                onEvent: event
            } 
        });

        for (const action of actions) {
            const actionType = this.actions.get(action.type);
            if (!actionType) {
                this.logger.error(`Could not find @ActionType for ${action.type}.`);
                continue;
            }

            const channel = await DiscordUtil.fetchChannelOrThread(action, this.client);

            await actionType.execute({
                channel, 
                command,
                data: action.data
            });
        }
    }
}