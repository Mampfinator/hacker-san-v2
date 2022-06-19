import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheCollection } from "src/shared/util/cache-collection";
import { TwitterApi, UserV2 } from "twitter-api-v2";
import { TwitterConfig } from "../config/config";

@Injectable()
export class TwitterApiService extends TwitterApi {
    private readonly userCache = new CacheCollection<string, UserV2>({
        autoSweep: true,
        ttl: 300000,
    });

    constructor(config: ConfigService) {
        const { token } = config.get<TwitterConfig>("TWITTER");
        super(token);
    }

    public async fetchUserByName(
        name: string,
        force?: boolean,
    ): Promise<UserV2 | undefined> {
        if (!force) {
            const exists = this.userCache.findOne(
                user => user.username === name,
            );
            if (exists) return exists;
        }

        const { data: user } = await this.v2.userByUsername(name, {
            "user.fields": ["profile_image_url"],
        });

        if (user) {
            this.userCache.set(user.id, user);
            return user;
        }
    }

    public async fetchUserById(
        id: string,
        force?: boolean,
    ): Promise<UserV2 | undefined> {
        if (!force && this.userCache.has(id)) return this.userCache.get(id);

        const { data: user } = await this.v2.user(id, {
            "user.fields": ["profile_image_url"],
        });
        if (!user) throw new Error(`Could not find user with id ${id}.`);

        ///const [user] = users;

        if (user) {
            this.userCache.set(user.id, user);
            return user;
        }
    }
}
