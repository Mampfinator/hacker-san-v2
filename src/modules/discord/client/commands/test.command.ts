import { Injectable } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { CommandInteraction, CacheType } from "discord.js";
import { TwitterSpace } from "src/modules/twitter/models/twitter-space.entity";
import { GetSpacesRequest } from "src/modules/twitter/requests/get-spaces.request";
import { In } from "typeorm";
import { ISlashCommand, SlashCommand } from "../slash-command";

@Injectable()
@SlashCommand({
    commandData: {
        name: "test",
        description: "Tested."
    }
})
export class TestCommand implements ISlashCommand {
    public static instance: TestCommand;
    constructor(
        private readonly commandBus: CommandBus
    ) {
        TestCommand.instance = this;
    }

    async execute(interaction: CommandInteraction<CacheType>) {
        const spaces = await this.commandBus.execute<GetSpacesRequest, TwitterSpace[]>(new GetSpacesRequest({}));

        console.log(spaces);

        await interaction.reply(`${spaces.map(space => space.id).join(" | ")}`);
    }
}