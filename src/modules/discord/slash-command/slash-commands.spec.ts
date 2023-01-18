import { DiscoveryModule } from "@nestjs-plus/discovery";
import { Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "./decorators/command.decorator";
import { Interaction } from "./decorators/interaction.decorator";
import { Option, String } from "./decorators/option.decorator";
import { OptionType } from "./decorators/option.decorator.types";
import { SlashCommand } from "./decorators/slash-command.decorator";
import { SlashCommandDiscovery } from "./slash-command.discovery";

describe("SlashCommand tests", () => {
    describe("Handler detection & API data building", () => {
        async function getDiscovery(...commands: Type<any>[]): Promise<SlashCommandDiscovery> {
            const moduleRef = await Test.createTestingModule({
                imports: [DiscoveryModule],
                providers: [SlashCommandDiscovery, ...(commands ?? [])],
            }).compile();
    
            return moduleRef.get(SlashCommandDiscovery);
        }
    
        test("if it finds and correctly assigns commands with a default handler", async () => {
            @SlashCommand({ name: "test", description: ":)" })
            class TestCommand {
                @Command()
                handle(@Option({ type: OptionType.String, description: "test", name: "tested" }) test: string) {}
            }
    
            const discovery = await getDiscovery(TestCommand);
            await discovery.discover();
    
            const [testData] = discovery.getApiData();
    
            expect(testData).toMatchObject({
                name: "test",
                description: ":)",
                options: [
                    {
                        type: OptionType.String,
                        description: "test",
                        name: "tested",
                    },
                ],
            });
    
            const testHandler = discovery.getHandler({ commandName: "test" });
            expect(testHandler.methodName).toBe("handle");
        });
    
        test("if it finds commands with different subcommands and their handlers, and also builds API object correctly", async () => {
            @SlashCommand({ name: "test", description: ":)" })
            class TestCommand {
                @Command({ name: "subcommand", description: "I'm a test!" })
                testMethod(
                    @Option({ type: OptionType.String, description: "Test option", name: "tested" }) tested: string,
                ) {
                    return tested;
                }
    
                @Command({ name: "other_subcommand", description: "I'm a different test!" })
                otherTestMethod(@Interaction() interaction: ChatInputCommandInteraction) {}
            }
    
    
            const discovery = await getDiscovery(TestCommand);
            await discovery.discover();
    
            const apiData = discovery.getApiData();
    
            expect(discovery.getApiData().length).toBe(1);
    
            const handler = discovery.getHandler({ commandName: "test", subcommandName: "subcommand" });
            expect(typeof handler.constructor).toBe("function");
            expect(handler.constructor.name).toBe("TestCommand");
            expect(typeof handler.methodName).toBe("string");
            expect(typeof handler.methodRef).toBe("function");
    
            expect(apiData[0]).toMatchObject({
                name: "test",
                description: ":)",
                options: [
                    {
                        type: OptionType.Subcommand,
                        name: "subcommand",
                        description: "I'm a test!",
                        options: [
                            {
                                type: OptionType.String,
                                description: "Test option",
                                name: "tested",
                            },
                        ],
                    },
                    {
                        type: OptionType.Subcommand,
                        name: "other_subcommand",
                        description: "I'm a different test!",
                        options: [],
                    },
                ],
            });
        });
    
        test("if it handles slashcommand subcommand groups with several subcommands accordingly", async () => {
            @SlashCommand({name: "test", description: "", subcommandGroups: [
                {name: "create", description: ""}
            ]})
            class TestCommand {
                @Command({name: "test1", group: "create", description: ""})
                test1(
                    @String({name: "hi", description: "", required: true}) hi: string,
                ) {}
    
                @Command({name: "test2", group: "create", description: ""})
                test2(
                    @String({name: "hi", description: ""}) hi: string,
                ) {}
    
                @Command({name: "remove", description: ""})
                remove() {}
            }
    
            const discovery = await getDiscovery(TestCommand);
            await discovery.discover();
    
            const [apiData] = discovery.getApiData();
    
            expect(apiData).toMatchObject({
                name: "test",
                description: "",
                options: [
                    {
                        name: "create",
                        description: "",
                        type: OptionType.SubcommandGroup,
                        options: [
                            {
                                name: "test1",
                                description: "",
                                type: OptionType.Subcommand,
                                options: [
                                    {
                                        name: "hi",
                                        description: "",
                                        type: OptionType.String,
                                    }
                                ]
                            }, 
                            {
                                name: "test2",
                                description: "",
                                type: OptionType.Subcommand,
                                options: [
                                    {
                                        name: "hi",
                                        description: "", 
                                        type: OptionType.String, 
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        name: "remove",
                        description: "",
                        type: OptionType.Subcommand,
                        options: []
                    }
                ]
            });
    
        });
    })
});
