import { PostEntity } from "../../models/post.entity";
import { PlatformBaseFindQuery } from "../platform.base-find.query";

export class FindPostsQuery<One extends boolean = false> extends PlatformBaseFindQuery<PostEntity, One> {}
