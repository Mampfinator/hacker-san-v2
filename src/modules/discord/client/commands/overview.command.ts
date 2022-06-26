import { SlashCommandBuilder } from "@discordjs/builders";
import { QueryBus } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { CommandInteraction, CacheType } from "discord.js";
import { SUPPORTED_PLATFORMS } from "src/constants";
import { ChannelsQueryResult } from "src/modules/platforms/queries/channels.handler";
import { ChannelsQuery } from "src/modules/platforms/queries/channels.query";
import { MultipageMessage } from "src/shared/util/multipage-message";
import { Repository } from "typeorm";
import { Platform } from "src/constants";
import { GuildSettings } from "../../models/settings.entity";
import { ISlashCommand, SlashCommand } from "./slash-command";

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("overview")
        .setDescription("Get an overview of what's happening!"),
})
export class OverviewCommand implements ISlashCommand {
    constructor(
        @InjectRepository(GuildSettings)
        private readonly settingsRepo: Repository<GuildSettings>,
        private readonly queryBus: QueryBus,
    ) {}

    async execute(interaction: CommandInteraction<CacheType>) {
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
