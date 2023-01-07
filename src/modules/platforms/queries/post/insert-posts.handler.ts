import { QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PostEntity } from "../../models/post.entity";
import { PlatformBaseInsertHandler } from "../platform.base-insert.handler";
import { InsertPostsQuery } from "./insert-posts.query";

@QueryHandler(InsertPostsQuery)
export class InsertPostsHandler extends PlatformBaseInsertHandler<PostEntity> {
    constructor(@InjectRepository(PostEntity) repository: Repository<PostEntity>) {
        super(repository);
    }
}
