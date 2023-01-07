import { QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PostEntity } from "../../models/post.entity";
import { FindPostsQuery } from "./find-posts.query";
import { PlatformBaseFindHandler } from "../platform.base-find.handler";

@QueryHandler(FindPostsQuery)
export class FindPostsHandler extends PlatformBaseFindHandler<PostEntity> {
    constructor(@InjectRepository(PostEntity) repository: Repository<PostEntity>) {
        super(repository);
    }
}
