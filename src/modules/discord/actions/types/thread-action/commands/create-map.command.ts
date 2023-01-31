import { Command } from "@nestjs-architects/typed-cqrs";
import { StreamEntity } from "../../../../../platforms/models/stream.entity";

export class CreateMapCommand extends Command<void> {
    constructor(
        public readonly video: StreamEntity,
    ) {
        super();
    }
}