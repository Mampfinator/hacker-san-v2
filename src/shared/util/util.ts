export namespace Util {
    export function interpolate(base: string, dict: Record<string, string>) {
        for (const [key, value] of Object.entries(dict)) {
            base = base.replace(new RegExp(`\{${key}\}`, "g"), value);
        }

        return base;
    }

    export function batch<T>(input: T[], batchSize = 10): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < input.length; i += batchSize) {
            batches.push(input.slice(i, i + batchSize));
        }
        return batches;
    }

    export function pluralize(amount: number, singular: string, plural: string) {
        return amount == 1 ? singular : plural;
    }

    export function firstUpperCase(value: string): string {
        const [first, ...rest] = Array.from(value);
        return `${first.toUpperCase()}${rest.join("")}`;
    }

    /**
     * @param error The exception that was thrown.
     * @param handlers The handlers. If any handler does not return true, the error will be rethrown.
     */
    export async function ignore(error, ...handlers: ((exception: any) => boolean | Promise<boolean>)[]) {
        for (const handler of handlers) {
            if (!(await handler(error))) throw error;
        }
    }

    export function setDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
        const difference = new Set(setA);

        for (const element of setB) {
            difference.delete(element);
        }

        return difference;
    }

    export function symmetricSetDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
        const difference = new Set(setA);

        for (const element of setB) {
            difference[difference.has(element) ? "delete" : "add"](element);
        }

        return difference;
    }

    export function last<T extends Array<any>>(array: T): LastArrayElement<T> {
        return array[array.length - 1];
    }

    /**
     * Assigns all enumerable properties from `source` to `target` if the property's value in source is not `undefined`.
     * @param target the object to assign to.
     * @param source the object to assign from.
     */
    export function assignIfDefined(target: object, source: object) {
        for (const [key, value] of Object.entries(source)) {
            if (typeof value == "undefined") continue;
            target[key] = value;
        }
    }

    /**
     * Returns a **new** object that overwrites existing objects.
     * Also merges sub-objects and concatenates arrays if from[key] & into[key] are the same type.
     */
    export function merge<T extends object, U extends object>(from: T, into: U): T & U {
        const obj: Record<string, any> = { ...into };

        for (const [key, value] of Object.entries(from)) {
            const intoValue = into[key];
            if (Array.isArray(value) && Array.isArray(intoValue)) {
                obj[key] = [...value, ...intoValue];
            } else if (
                Object.getPrototypeOf(value) === Object.prototype &&
                Object.getPrototypeOf(intoValue) === Object.prototype
            ) {
                obj[key] = merge(value, intoValue);
            } else obj[key] = value;
        }

        return obj as T & U;
    }
}

// I can do this, because I'm the package author and I'll know which updates will break it. :)
export { RequireAtLeastOne, RequireOnlyOne } from "yt-scraping-utilities/dist/util";

export type Primitive = string | number | boolean;
export type LastArrayElement<ValueType extends readonly unknown[]> = ValueType extends readonly [infer ElementType]
    ? ElementType
    : ValueType extends readonly [infer _, ...infer Tail]
    ? LastArrayElement<Tail>
    : ValueType extends ReadonlyArray<infer ElementType>
    ? ElementType
    : never;

export type ConditionalMultiple<One extends boolean, T> = One extends true ? T : T[];

export type ElementType<TArray extends Array<unknown>> = TArray extends Array<infer TElement> ? TElement : never;
