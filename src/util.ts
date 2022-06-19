export namespace Util {
    export function interpolate(base: string, dict: Record<string, string>) {
        for (const [key, value] of Object.entries(dict)) {
            base = base.replace(new RegExp(`\{${key}\}`, "g"), value);
        }

        return base;
    }
}
