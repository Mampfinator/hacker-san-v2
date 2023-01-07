import { QueryBus } from "@nestjs/cqrs";
import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder } from "discord.js";
import { MultipageMessage } from "../../../../shared/util/multipage-message";
import { In, Repository } from "typeorm";
import { GuildSettings } from "../../models/settings.entity";
import { ISlashCommand, SlashCommand } from "../slash-command";
import { InjectRepository } from "@nestjs/typeorm";
import { FindChannelQuery } from "../../../platforms/queries";
import { from, groupBy, lastValueFrom, mergeMap, of, pipe, toArray, zip } from "rxjs";

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

        const settings = await this.settingsRepo.findOne({
            where: { id: interaction.guildId },
        });

<<<<<<< HEAD:src/modules/discord/slash-commands/types/overview.command.ts
        const channels = await this.queryBus.execute(
            new FindChannelQuery({ one: false }).forPlatform(In(["youtube", "twitter"])),
        );
=======
        const channels = await this.queryBus.execute(new FindChannelQuery({ one: false }).forPlatform(In(["youtube", "twitter"])));
>>>>>>> 231276d (Temporary fix for QueryFailedError on empty where):src/modules/discord/client/commands/overview.command.ts

        const reply = new MultipageMessage({ interaction });

        const channelsByPlatform = await lastValueFrom(
            from(channels).pipe(
                groupBy(channel => channel.platform),
                mergeMap(group => zip(of(group.key), group.pipe(toArray()))),
                toArray(),
            ),
        );

        for (const [platform, channels] of channelsByPlatform) {
            const channelIds = new Set(settings.primaryChannels[platform]);

            const content = channels.map(channel => JSON.stringify(channel, null, 4)).join("\n");

            reply.addPage({
                content: content.length > 0 ? content : "No channels for this platform.",
            });
        }

        await reply.send();
    }
}
