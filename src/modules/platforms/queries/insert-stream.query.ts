import { IQuery } from "@nestjs/cqrs";
import { StreamEntity, StreamStatus } from "../models/stream.entity";


type ExcludeMethods<T> = {
    [P in keyof T as T[P] extends Function ? never : P]: T[P];
}
export type InsertQueryItem<T extends {id: any}> = Omit<ExcludeMethods<T>, "id">;


export class InsertStreamQuery implements IQuery {
    constructor(
        public readonly stream: InsertQueryItem<StreamEntity>
    ) {}
}