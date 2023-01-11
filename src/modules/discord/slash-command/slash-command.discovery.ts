import { DiscoveryService } from "@nestjs-plus/discovery";
import { Injectable, OnModuleInit, Type } from "@nestjs/common";
import { APIApplicationCommand } from "discord.js";
import { getHandlers, getParameters, SLASHCOMMAND_DATA } from "./slash-command.constants";
import { ISlashCommandDiscovery, SlashCommandHandler } from "./slash-command.types";

@Injectable()
export class SlashCommandDiscovery implements ISlashCommandDiscovery /*, OnModuleInit*/ {
    private readonly handlerMap = new Map<string, SlashCommandHandler>();
    private readonly apiData: APIApplicationCommand[] = [];

    constructor(private readonly discoveryService: DiscoveryService) {}

    getHandler(identifier: string): SlashCommandHandler {
        return this.handlerMap.get(identifier);
    }
    getApiData(): APIApplicationCommand[] {
        return [...this.apiData];
    }

    async onModuleInit() {
        await this.discover();
    }

    async discover() {
        const providers = await this.discoveryService.providersWithMetaAtKey<APIApplicationCommand>(SLASHCOMMAND_DATA);

        for (const { discoveredClass, meta } of providers) {
            const handlers = getHandlers(discoveredClass.injectType);
            const commandName = meta.name;

            for (const [partialIdentifier, methodName] of handlers) {
                if (typeof partialIdentifier === "string") {
                    const identifier = `${commandName}.${partialIdentifier}`;

                    const methodRef = discoveredClass.instance[methodName] as (...args: any) => any;
                    if (typeof methodRef !== "function")
                        throw new Error(
                            `${discoveredClass.name} (${commandName}): Expected ${String(
                                methodName,
                            )} to be function, got ${typeof methodRef}`,
                        );

                    const parameters = getParameters(discoveredClass.injectType, methodName);
                    if (parameters.length > 0) {
                        let [subcommandGroupName, subcommandName] = partialIdentifier.split(".");
                        if (!subcommandName) {
                            subcommandName = subcommandGroupName;
                            subcommandGroupName = undefined;
                        }

                        // super ugly, but it'll do (hopefully)
                        let options: any[] = meta.options;
                        if (subcommandGroupName && subcommandName) {
                            options = (options.find(({ name }) => name === subcommandGroupName) as any).options.find(
                                ({ name }) => name === subcommandName,
                            );
                        } else if (subcommandName) {
                            options = (options.find(({ name }) => name === subcommandName) as any).options;
                        }

                        options.push(
                            ...(parameters
                                .filter(parameter => parameter.type === "options")
                                .map(param => param.value) as any[]),
                        );
                    }
                }

                // TODO: fix
                this.handlerMap.set(identifier, { methodName, methodRef, constructor: discoveredClass.injectType });
            }

            this.apiData.push(meta);
        }
    }
}
