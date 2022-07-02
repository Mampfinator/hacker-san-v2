import { REST } from "@discordjs/rest";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Routes from "discord-api-types/v10";
import { DiscordConfig } from "../config/config";

@Injectable()
export class DiscordRESTService extends REST {
    public routes = Routes;

    constructor(private readonly config: ConfigService) {
        const { token } = config.get<DiscordConfig>("DISCORD");

        super({
            version: "10",
        });

        this.setToken(token);
    }
}
