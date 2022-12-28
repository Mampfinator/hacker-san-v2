import { QueryBus } from "@nestjs/cqrs";
import {
    ChatInputCommandInteraction,
    CacheType,
    SlashCommandBuilder,
} from "discord.js";
import { SUPPORTED_PLATFORMS, Platform } from "../../../../constants";
import { ChannelsQueryResult } from "../../../platforms/queries/channels.handler";
import { ChannelsQuery } from "../../../platforms/queries/channels.query";
import { MultipageMessage } from "../../../../shared/util/multipage-message";
import { Repository } from "typeorm";
import { GuildSettings } from "../../models/settings.entity";
import { ISlashCommand, SlashCommand } from "./slash-command";
import { InjectRepository } from "@nestjs/typeorm";

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("overview")
        .setDescription("Get an overview of what's happening!")
        .setDMPermission(false),
})
export class OverviewCommand implements ISlashCommand {
    constructor(
        @InjectRepository(GuildSettings)
        private readonly settingsRepo: Repository<GuildSettings>,
        private readonly queryBus: QueryBus,
    ) {}

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        if (!interaction.guildId) {
            interaction.reply("This command can only be used in a server.");
            return;
        }

        const channelsPromises: Promise<
            ChannelsQueryResult & { platform: Platform }
        >[] = [];

        const settings = await this.settingsRepo.findOne({
            where: { id: interaction.guildId },
        });

        for (const platform of SUPPORTED_PLATFORMS) {
            channelsPromises.push(
                this.queryBus
                    .execute<ChannelsQuery, ChannelsQueryResult>(
                        new ChannelsQuery(platform),
                    )
                    .then(result => ({ ...result, platform })),
            );
        }

        const queryResults = await Promise.all(channelsPromises);

        const reply = new MultipageMessage({ interaction });

        for (let { channels, platform } of queryResults) {
            const channelIds = new Set(settings.primaryChannels[platform]);

            // TODO: finish this.
            // The plan: map streams (that I'll need to fetch somehow...) to pages in the message. For each platform, have (a) `live` page(s) followed by (an) `upcoming` page(s).
            // :GuraPain:
            channels = channels.filter(channel => channelIds.has(channel.id));

            const content = channels
                .map(channel => JSON.stringify(channel, null, 4))
                .join("\n");

            reply.addPage({
                content:
                    content.length > 0
                        ? content
                        : "No channels for this platform.",
            });
        }

        await reply.send();
    }
}
