import { CommandHandler, IInferredCommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TempChannelMap } from "../temp-channel-map.entity";
import { CreateMapCommand } from "./create-map.command";

@CommandHandler(CreateMapCommand)
export class CreateMapHandler implements IInferredCommandHandler<CreateMapCommand> {
    constructor(
        @InjectRepository(TempChannelMap) private readonly tempChannelMaps: Repository<TempChannelMap>
    ) {}
    
    async execute({video: {platform, platformId}}: CreateMapCommand): Promise<void> {
        await this.tempChannelMaps.save({platform, platformId, channelIds: []});
    }
}