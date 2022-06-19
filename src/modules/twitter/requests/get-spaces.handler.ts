import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { GetSpacesRequest } from "./get-spaces.request";
import { Repository } from "typeorm";
import { TwitterSpace } from "../models/twitter-space.entity";
import { InjectRepository } from "@nestjs/typeorm";

@CommandHandler(GetSpacesRequest)
export class GetSpacesHandler implements ICommandHandler {
    constructor(
        @InjectRepository(TwitterSpace)
        private readonly spaces: Repository<TwitterSpace>,
    ) {}

    async execute({ filter }: GetSpacesRequest): Promise<TwitterSpace[]> {
        return await this.spaces.find({ where: { ...filter } });
    }
}
