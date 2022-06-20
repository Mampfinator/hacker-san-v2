import { DynamicModule, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { TwitterConfig, YouTubeConfig } from "../config/config";
import { EnsureChannelHandler } from "./commands/ensure-channel.handler";

@Module({
    imports: [CqrsModule],
    providers: [EnsureChannelHandler],
})
export class PlatformModule {}


/*
interface PlatformModuleFactoryOptions {
    youtubeConfig: YouTubeConfig;
    twitterConfig: TwitterConfig;
}

export interface PlatformModuleAsyncOptions {
    useFactory: (
        ...args: any[]
    ) => PlatformModuleFactoryOptions | Promise<PlatformModuleFactoryOptions>;
}

export class PlatformModule {
    public static async registerAsync(
        options: PlatformModuleAsyncOptions,
    ): Promise<DynamicModule> {
        const {} = await options.useFactory();

        return {
            module: PlatformModule,
        };
    }
}
*/
