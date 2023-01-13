import { DiscoveryService } from "@nestjs-plus/discovery";
import { Injectable, Logger, OnModuleInit, Type } from "@nestjs/common";
import { APIApplicationCommand } from "discord.js";
import { from, groupBy, lastValueFrom, mergeMap, of, pipe, take, toArray, zip } from "rxjs";
import { OptionType } from "./decorators/option.decorator.types";
import {
    CommandIdentifier,
    DEFAULT_HANDLER,
    getHandlers,
    getParameters,
    NO_GROUP_HANDLER,
    SlashCommandParameter,
    SLASHCOMMAND_DATA,
} from "./slash-command.constants";
import { ISlashCommandDiscovery, SlashCommandHandler } from "./slash-command.types";

// this sure is a thing
type HandlerMap<TKey = string | symbol, TValue = SlashCommandHandler> = Map<TKey, Map<TKey, Map<TKey, TValue>>>;

interface InternalIdentifier {
    commandName: string;
    subcommandGroupName: string | symbol;
    subcommandName: string | symbol;
}

@Injectable()
export class SlashCommandDiscovery implements ISlashCommandDiscovery /*, OnModuleInit*/ {
    private readonly logger = new Logger(SlashCommandDiscovery.name);
    private handlerMap: HandlerMap;
    private readonly apiData: APIApplicationCommand[] = [];
    constructor(private readonly discoveryService: DiscoveryService) {}

    public getHandler(identifier: CommandIdentifier): SlashCommandHandler | undefined {
        const handler = this.findHandler(identifier);

        if (!handler)
            return this.logger.error(`Could not find handler for ${JSON.stringify(identifier)}!`) as undefined;

        return handler;
    }

    private findHandler({ commandName, subcommandGroupName, subcommandName }: CommandIdentifier) {
        return this.handlerMap
            .get(commandName)
            ?.get(subcommandGroupName ?? subcommandName ? NO_GROUP_HANDLER : DEFAULT_HANDLER)
            ?.get(subcommandName ?? DEFAULT_HANDLER);
    }

    public getApiData(): APIApplicationCommand[] {
        return [...this.apiData];
    }

    async onModuleInit() {
        await this.discover();
    }

    async discover() {
        const providers = await this.discoveryService.providersWithMetaAtKey<APIApplicationCommand>(SLASHCOMMAND_DATA);

        const handlers: { identifier: InternalIdentifier; handler: SlashCommandHandler }[] = [];

        for (const {
            discoveredClass: { instance, injectType },
            meta: apiCommand,
        } of providers) {
            const commandHandlers = getHandlers(injectType);
            const commandName = apiCommand.name;

            for (const { subcommandGroupName, subcommandName, methodKey } of commandHandlers) {
                handlers.push({
                    identifier: {
                        commandName,
                        subcommandName: subcommandName,
                        subcommandGroupName: subcommandGroupName,
                    },
                    handler: {
                        methodName: methodKey,
                        methodRef: instance[methodKey] as (...args: any[]) => any,
                        constructor: injectType,
                    },
                });

                const parameters = getParameters(injectType, methodKey)?.filter(
                    ({ type }) => type === "options",
                ) as SlashCommandParameter<"options">[];
                if (
                    !parameters ||
                    parameters?.length === 0
                )
                    continue;

                let options: any[];
                // is global default handler
                if (subcommandGroupName === DEFAULT_HANDLER && subcommandName === DEFAULT_HANDLER) {
                    options = apiCommand.options;

                // is no-group subcommand handler
                } else if (subcommandGroupName === NO_GROUP_HANDLER && typeof subcommandName === "string") {
                    options = (
                        apiCommand.options.find(
                            ({ name, type }) => name === subcommandName && type === OptionType.Subcommand,
                        ) as any
                    ).options;

                // is full group subcommand handler
                } else if (typeof subcommandGroupName === "string" && typeof subcommandName === "string") {
                    options = (
                        apiCommand.options.find(
                            ({ type, name }) => name === subcommandGroupName && type === OptionType.SubcommandGroup,
                        ) as any
                    ).options.find(({ type, name }) => name === subcommandName && type === OptionType.Subcommand);
                } else {
                    throw new Error(
                        `Could not determine how to apply options to ${commandName}.${String(
                            subcommandGroupName,
                        )}.${String(subcommandName)}!`,
                    );
                }

                options.push(...parameters.map(parameter => parameter.value));
            }

            this.apiData.push(apiCommand);
        }

        this.handlerMap = await this.compile(handlers);
    }

    /**
     * Compiles a handler map for faster lookup.
     */
    async compile(handlers: { identifier: InternalIdentifier; handler: SlashCommandHandler }[]): Promise<HandlerMap> {
        const iterable = await lastValueFrom(
            from(handlers).pipe(
                groupBy(({ identifier: { commandName } }) => commandName),
                mergeMap(commandGroup =>
                    zip(
                        of(commandGroup.key),
                        commandGroup.pipe(
                            groupBy(({ identifier: { subcommandGroupName } }) => subcommandGroupName),
                            mergeMap(subcommandGroup =>
                                zip(
                                    of(subcommandGroup.key),
                                    subcommandGroup.pipe(
                                        groupBy(({ identifier: { subcommandName } }) => subcommandName),
                                        mergeMap(subcommands =>
                                            zip(of(subcommands.key), subcommands.pipe(take(1), toArray())),
                                        ),
                                        toArray(),
                                    ),
                                ),
                            ),
                            toArray(),
                        ),
                    ),
                ),
                toArray(),
            ),
        );

        const map = new Map(
            iterable.map(([commandKey, iter]) => [
                commandKey,
                new Map(
                    iter.map(([groupKey, innerIter]) => [
                        groupKey,
                        new Map(innerIter.map(([handlerKey, [{ handler }]]) => [handlerKey, handler])),
                    ]),
                ),
            ]),
        );

        return map;
    }
}
