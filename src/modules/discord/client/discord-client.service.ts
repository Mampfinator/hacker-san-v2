import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
    AutocompleteInteraction,
    Client,
    CommandInteraction,
    Message,
    MessageEmbed,
} from "discord.js";
import { DiscordConfig } from "src/modules/config/config";
import { Repository } from "typeorm";
import { GuildSettings } from "../models/settings.entity";
import { getCommandMetadata, SlashCommand } from "./commands/slash-command";
import { getEvents, handleEvent, On } from "./on-event";
import { InjectCommands } from "./commands/slash-commands.provider";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { FetchPostsCommand } from "src/modules/youtube/community-posts/commands/fetch-posts.command";
import { ChannelInfo, CommunityPost } from "yt-scraping-utilities";
import { DiscordUtil } from "../util";
import { handleAutocomplete } from "./commands/autocomplete";
import { Interval } from "@nestjs/schedule";
import { SUPPORTED_PLATFORMS } from "src/constants";
import { ChannelsQuery } from "src/modules/platforms/queries/channels.query";
import { ChannelsQueryResult } from "src/modules/platforms/queries/channels.handler";
import { Util } from "src/util";
import { MultipageMessage } from "src/shared/util/multipage-message";
import { getActions } from "../actions/action";

@Injectable()
export class DiscordClientService extends Client {
    private readonly logger = new Logger(DiscordClientService.name);
    private readonly commands: Map<string, SlashCommand> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        @InjectRepository(GuildSettings)
        private readonly settingsRepository: Repository<GuildSettings>,
        @InjectCommands() slashCommands: SlashCommand[],
    ) {
        super({
            intents: ["GUILDS", "GUILD_MESSAGES"],
        });

        for (const command of slashCommands) {
            const { commandData } = getCommandMetadata(command);
            this.commands.set(commandData.name, command);
        }
    }

    public async login(token?: string): Promise<string> {
        const events = [...getEvents(this).keys()];
        this.logger.debug(
            `Registering event handler for @On marked events: ${events.join(
                ", ",
            )}`,
        );

        for (const event of events) {
            this.on(event, (...args) => this.handleEvent(event, ...args));
        }

        this.logger.debug(
            `Found ${this.commands.size} commands: ${[
                ...this.commands.keys(),
            ].join(", ")}.`,
        );

        this.logger.debug(
            `Found ${getActions().length} action types: ${getActions()
                .map(action => action.name)
                .join(", ")}.`,
        );

        const ret = await super.login(token);
        await this.refreshPresence();
        return ret;
    }

    private handleEvent(event: string, ...args: any[]): void {
        const { success, errors } = handleEvent(event, this, args);
        if (!success) {
            this.logger.warn("handleEvent failed.");
            for (const error of errors) this.logger.error(error);
        }
    }

    @On("ready")
    async ready() {
        await this.guilds.fetch();
        for (const guild of this.guilds.cache.values()) {
            const existing = await this.settingsRepository.findOne({
                where: { id: guild.id },
            });
            if (!existing) {
                this.logger.log(`Found new guild ${guild.name} (${guild.id})`);
                await this.settingsRepository.insert({
                    id: guild.id,
                });
            }
        }

        await this.application.fetch();
        if (this.configService.get<DiscordConfig>("DISCORD").cleanUpOnStart) {
            this.logger.debug("Cleaning up all old commands.");

            await this.application.commands.fetch();
            for (const commandId of this.application.commands.cache.keys()) {
                await this.application.commands.delete(commandId);
            }
        }

        const { deployGlobalCommands, testGuildId } =
            this.configService.get<DiscordConfig>("DISCORD");
        this.logger.debug(
            `Deploying slash commands ${
                deployGlobalCommands ? "globally" : `to ${testGuildId}`
            }.`,
        );

        for (const command of this.commands.values()) {
            const { commandData, forGuild } = getCommandMetadata(command);

            await this.application.commands.create(
                commandData,
                deployGlobalCommands
                    ? forGuild(
                          this.configService.get<DiscordConfig>("DISCORD")
                              .ownerGuild,
                      )
                    : this.configService.get<DiscordConfig>("DISCORD")
                          .testGuildId,
            );
            this.logger.debug(`Created command for ${commandData.name}`);
        }

        this.logger.log(`Signed in as ${this.user.tag} (${this.user.id}).`);
    }

    @On("interactionCreate")
    async handleSlashCommand(interaction: CommandInteraction) {
        if (!interaction.isApplicationCommand()) return;

        const { commandName } = interaction;
        this.logger.debug(`Received slash command for ${commandName}.`);
        const handler = this.commands.get(commandName);

        if (!handler) return interaction.reply("Command not found!");
        await handler.execute(interaction);

        if (!interaction.replied) {
            this.logger.warn(
                `${commandName} (${interaction.id}) never got a reply!`,
            );
        }
    }

    @On("interactionCreate")
    handleAutocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.isAutocomplete()) return;

        const { commandName, options } = interaction;
        const { name } = options.getFocused(true);
        const command = this.commands.get(commandName);

        if (!command)
            return this.logger.warn(
                `Could not handle autocomplete for ${commandName} - ${name}: Command not found.`,
            );
        handleAutocomplete(interaction, command);
    }

    @On("messageCreate")
    async detectCommunityPostLink(message: Message) {
        if (message.author.id == this.user.id) return;

        const postIdRegex =
            /(?<=youtube.com\/post\/)Ug[A-z0-9_\-]+|(?<=youtube.com\/channel\/.+\/community\?lb=)Ug[A-z0-9_\-]+/g;

        const { content } = message;
        const ids = [...content.matchAll(postIdRegex)].flat();
        if (!ids || ids.length == 0) return;

        this.logger.debug(`Found community post IDs: ${ids}.`);

        const embeds: MessageEmbed[] = [];
        for (const id of ids) {
            const { posts, channel } = await this.commandBus.execute<
                FetchPostsCommand,
                { posts: CommunityPost[]; channel: ChannelInfo }
            >(new FetchPostsCommand({ postId: id, includeChannelInfo: true }));
            const embed = DiscordUtil.postToEmbed(posts[0], channel);

            this.logger.debug(`Generated embed for ${id}.`);
            embeds.push(embed);
        }

        if (embeds.length == 1) {
            await message.reply({
                embeds,
                allowedMentions: { repliedUser: false },
            });
        } else {
            const reply = new MultipageMessage({
                channel: message.channel as any,
            });

            for (const embed of embeds) {
                reply.addPage({ embeds: [embed] });
            }

            await reply.send({
                asReply: true,
                message,
                replyOptions: { allowedMentions: { repliedUser: false } },
            });
        }
    }
///Added OnReact to messages for otsu messages. August 2nd, 2022
    @On("messageCreate")
    const otsuRegEx = /^(?:otsu|oya)([^\s]+)|^saranara/
    const reactions =
    [
        {otsunuggies:"839042514781732905"},
        {otsufuri: "806110229397504000"},
        {otsumeno: "826832284337307708"},
        {otsurita: "840137087894421505"},
        {otsuboin: "840137087806341150"},
        {oyashiki: "854628627215810561"},
        {otsuyura: "873632813910470717"},
        {otsunia: "854667744775897108"},
        {otsupina: "918365263206952980"},
        {otsunaki: "994509287365812265"},
        {saranara: "918796139627675688"},
        {otsunon: "918796047243939882"},
        {oyasumi: "926892367770959882"},
        {otsuprism: "837419300927045713"}
    ]
    const MissingReact =
    `Someone tried to otsu but there's no react for it.
    User:      %s %s
    Otsu:      %s
    messageID: %s
    message:   %s
    `

    client.on("messageCreate", message => {
        const content = message.content.toLowerCase();
        console.log('The message is seen');

        var match = otsuRegEx.exec(content);
        if (match) {
            var emojiID = reactions[match[0]];
            if (emojiID) {
                message.react(emojiID).then(console.log);
            } else {
                console.log(MissingReact,
                    message.author.id, message.author.username,
                    match[0],
                    message.id,
                    message.content)
      }
  }
});
///Added OnReact to messages for otsu messages. August 2nd, 2022
    @Interval(60000)
    private async refreshPresence() {
        let channels = 0;
        for (const platform of SUPPORTED_PLATFORMS) {
            const response = await this.queryBus.execute<
                ChannelsQuery,
                ChannelsQueryResult
            >(new ChannelsQuery(platform));
            channels += response.channels.length;
        }

        await this.guilds.fetch();

        const guilds = this.guilds.cache.size;

        this.user.setPresence({
            activities: [
                {
                    name: `${channels} ${Util.pluralize(
                        channels,
                        "channel",
                        "channels",
                    )} in ${guilds} ${Util.pluralize(
                        guilds,
                        "server",
                        "servers",
                    )}.`,
                    type: "WATCHING",
                },
            ],
            status: "online",
        });
    }
}
