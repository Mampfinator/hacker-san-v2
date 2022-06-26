import { SUPPORTED_PLATFORMS } from "src/constants";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { Platform } from "src/constants";

function pushUnique<T>(arr: T[], value: T) {
    if (arr.includes(value)) return false;

    arr.push(value);
    return true;
}

const defaultPrimaryChannels = {};
for (const platform of SUPPORTED_PLATFORMS)
    defaultPrimaryChannels[platform] = [];

@Entity()
export class GuildSettings {
    public addPrimaryChannel(id: string, platform: Platform): boolean {
        return pushUnique(this.primaryChannels[platform], id);
    }

    public removePrimaryChannel(id: string, platform: Platform): boolean {
        const ids = this.primaryChannels[platform];
        this.primaryChannels[platform] = ids.filter(
            channelId => channelId !== id,
        );
        return ids.length !== this.primaryChannels[platform].length;
    }

    @PrimaryColumn()
    id: string;

    @Column("jsonb", { default: defaultPrimaryChannels })
    primaryChannels: Record<Platform, string[]>;
}
