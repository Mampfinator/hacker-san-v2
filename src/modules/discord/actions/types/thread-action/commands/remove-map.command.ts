import { Command } from "@nestjs-architects/typed-cqrs";
import { StreamEntity } from "../../../../../platforms/models/stream.entity";

export class RemoveMapCommand extends Command<void> {
    constructor(
        public readonly video: StreamEntity,
    ) {
        super(); 
    }
}