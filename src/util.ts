export namespace Util {
    export function interpolate(base: string, dict: Record<string, string>) {
        for (const [key, value] of Object.entries(dict)) {
            base = base.replace(new RegExp(`\{${key}\}`, "g"), value);
        }

        return base;
    }

    export function batch<T>(input: T[], batchSize = 10) {
        const batches: T[][] = [];
        for (let i = 0; i < input.length; i += batchSize) {
            batches.push(input.slice(i, i + batchSize));
        }
        return batches;
    }

    export function pluralize(
        amount: number,
        singular: string,
        plural: string,
    ) {
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
    export async function ignore(
        error,
        ...handlers: ((exception: any) => boolean | Promise<boolean>)[]
    ) {
        for (const handler of handlers) {
            if (!(await handler(error))) throw error;
        }
    }
}
