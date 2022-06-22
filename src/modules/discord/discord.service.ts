import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DiscordConfig } from "../config/config";
import { DiscordClientService } from "./client/discord-client.service";

@Injectable()
export class DiscordService implements OnApplicationBootstrap {
    private readonly logger = new Logger(DiscordService.name);

    constructor(
        private readonly client: DiscordClientService,
        private readonly config: ConfigService,
    ) {}

    async onApplicationBootstrap() {
        await this.start();
    }

    public async start() {
        const { token, doLogin } = this.config.get<DiscordConfig>("DISCORD");
        if (doLogin) await this.client.login(token);
    }
}
