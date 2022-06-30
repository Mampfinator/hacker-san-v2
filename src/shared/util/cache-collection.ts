const DEFAULT_TTL = 30000;
const DEFAULT_SWEEP_INTERVAL = 60000;



export interface CacheCollectionOptions {
    /**
     * How long to preserve cache entries for.
     * Default: `30000`
     */
    ttl?: number;
    /**
     * Whether or not to automatically traverse the cache on a given interval and clear out results older than the specified ttl.
     * Default: `false`.
     */
    autoSweep?: boolean;
    /**
     * The autoSweep frequency in ms.
     * Default: `60000`.
     */
    sweepFrequency?: number;
}

interface CacheEntry<T> {
    value: T;
    insertedAt: number;
}

// very hacky, but it works.
type MapBase = new <K, V>(entries?: ReadonlyArray<readonly [K, V]>) => {
    [P in Exclude<keyof Map<K, V>, "get" | "set">]: Map<K, V>[P];
};

const MapBase: MapBase = Map;
export class CacheCollection<TKey, TValue> extends MapBase<
    TKey,
    CacheEntry<TValue>
> {
    private readonly ttl: number;

    constructor(options?: CacheCollectionOptions) {
        super();

        this.ttl = options?.ttl ?? DEFAULT_TTL;

        if (options?.autoSweep) {
            setInterval(() => this.sweep(), options?.sweepFrequency ?? 60000);
        }
    }

    public get(key: TKey): TValue {
        const entry = Map.prototype.get.call(this, key);
        return entry?.value;
    }

    public set(key: TKey, value: TValue): this {
        Map.prototype.set.call(this, key, { value, insertedAt: Date.now() });
        return this;
    }

    public findOne(
        predicate: (value: TValue, key: TKey) => boolean,
    ): TValue | undefined {
        for (const [key, { value }] of this) {
            if (predicate(value, key)) return value;
        }
    }

    public sweep() {
        for (const [key, value] of this) {
            if (Date.now() - value.insertedAt > this.ttl) {
                this.delete(key);
            }
        }
    }
}
