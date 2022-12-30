import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Util } from "../../../util";
import {
    extractGridVideoRenderer,
    extractGridVideoRenderers,
    findActiveTab,
    parseRawData,
    VideoRenderer,
} from "yt-scraping-utilities";
import { ContinuationItemRenderer, YouTubeService } from "../youtube.service";
import { FullChannelCrawlCommand } from "./full-channel-crawl.command";
import { GridVideoRenderer } from "yt-scraping-utilities/dist/youtube-types";
import { Logger } from "@nestjs/common";
import { findValuesByKeys } from "yt-scraping-utilities/dist/util";

@CommandHandler(FullChannelCrawlCommand)
export class FullChannelCrawlHandler
    implements ICommandHandler<FullChannelCrawlCommand>
{
    private readonly logger = new Logger(FullChannelCrawlHandler.name);

    constructor(private readonly youtubeService: YouTubeService) {}

    async execute({ channelId }: FullChannelCrawlCommand): Promise<any> {
        this.logger.debug(`Got full channel crawl command for ${channelId}.`);

        // view = 0 for uploads
        const videoPage = (await this.youtubeService.fetchRaw(
            `https://youtube.com/channel/${channelId}/videos?view=0`,
            {},
            false,
        )) as string;

        this.logger.debug(`Got channel video page for ${channelId}.`);

        const { ytInitialData } = parseRawData({
            ytInitialData: true,
            source: videoPage,
        });

        const videos: VideoRenderer[] =
            extractGridVideoRenderers(ytInitialData);

        const { visitorData } =
            ytInitialData.responseContext.webResponseContextExtensionData
                .ytConfigData;

        const [initialContRenderer] = findValuesByKeys(
            findActiveTab(ytInitialData).tabRenderer.content.sectionListRenderer
                .contents[0],
            ["continuationItemRenderer"],
        ) as ContinuationItemRenderer[];

        let { token, clickTrackingParams } =
            this.extractInfo(initialContRenderer);

        this.logger.debug(
            `Continuation request params: \nvisitorData: ${visitorData}\ntoken: ${token}\nclickTrackingParams: ${clickTrackingParams}`,
        );

        while (token) {
            const {
                onResponseReceivedActions: [
                    {
                        appendContinuationItemsAction: { continuationItems },
                    },
                ],
            } = await this.youtubeService.doContinuationRequest<
                GridVideoRenderer,
                "gridVideoRenderer",
                false
            >({ token, clickTrackingParams, visitorData });
            const gridVideoRenderers = continuationItems
                .filter(item => "gridVideoRenderer" in item)
                .map(
                    ({
                        gridVideoRenderer,
                    }: {
                        gridVideoRenderer: GridVideoRenderer;
                    }) => gridVideoRenderer,
                );

            const continuationRenderer = Util.last(continuationItems);
            videos.push(...gridVideoRenderers.map(extractGridVideoRenderer));

            if ("gridVideoRenderer" in continuationRenderer) {
                token = undefined;
                break;
            } else {
                const {
                    token: newToken,
                    clickTrackingParams: newClickTrackingParams,
                } = this.extractInfo(
                    continuationRenderer.continuationItemRenderer,
                );
                token = newToken;
                clickTrackingParams = newClickTrackingParams;
            }
        }

        return videos;
    }

    private extractInfo(continuationRenderer: ContinuationItemRenderer): {
        clickTrackingParams: string;
        token: string;
    } {
        return {
            clickTrackingParams:
                continuationRenderer?.continuationEndpoint?.clickTrackingParams,
            token: continuationRenderer?.continuationEndpoint
                ?.continuationCommand?.token,
        };
    }
}
