import { Controller, Post } from "@nestjs/common";
import { TwitcastingService } from "./twitcasting.service";
/* eslint-disable */
@Controller({ path: "twitcasting" })
export class TwitcastingController {
    constructor(private readonly service: TwitcastingService) {}

    @Post()
    async eventSub() {}
}
/* eslint-enable */
