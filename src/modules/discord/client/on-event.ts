const eventStorageKey = Symbol("EVENTS");
export const getEvents = (target: object) => {
    if (!Reflect.hasMetadata(eventStorageKey, target)) {
        Reflect.defineMetadata(eventStorageKey, new Map(), target);
    }

    return Reflect.getMetadata(eventStorageKey, target) as Map<string, (string | symbol)[]>;
};

/**
 *
 * @param event The event to listen to.
 * @returns
 */
export const On =
    (event: string): MethodDecorator =>
    (target, propertyKey) => {
        const events = getEvents(target);
        if (!events.has(event)) {
            events.set(event, []);
        }

        events.get(event).push(propertyKey);
    };

export const handleEvent = (eventName: string, target: object, args: any[]) => {
    const events = getEvents(target);

    const callbackNames = events.get(eventName);
    if (!callbackNames) return { success: false, errors: [] };

    let success = true;
    const errors: Error[] = [];

    for (const key of callbackNames) {
        try {
            target[key](...args);
        } catch (error) {
            success = false;
            errors.push(error);
        }
    }

    return { success, errors };
};
