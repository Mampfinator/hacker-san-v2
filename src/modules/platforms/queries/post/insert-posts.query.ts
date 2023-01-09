import { PostEntity } from "../../models/post.entity";
import { PlatformBaseInsertQuery } from "../platform.base-insert-query";

export class InsertPostsQuery extends PlatformBaseInsertQuery<PostEntity> {}
