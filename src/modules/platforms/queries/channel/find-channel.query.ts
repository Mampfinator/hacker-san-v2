import { ChannelEntity } from "../../models/channel.entity";
import { PlatformBaseFindQuery } from "../platform.base-find.query";

export class FindChannelQuery<One extends boolean = false> extends PlatformBaseFindQuery<ChannelEntity, One> {}
