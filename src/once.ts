import { AnyEventHandler, OnceEventHandler } from "./types.private";

/**
 * Event handler modifier for use with {@link EventSource#subscribe}.
 * Marks an event handler as being a one-time only handler that will
 * self-cancel upon being called the first time.
 * @param handler - An event handler implementation.
 * @returns A wrapped event handler that will be setup as a one-time only handler.
 */
export function once<F extends AnyEventHandler>(
    handler: F
): OnceEventHandler<F> {
    return {
        type: "once",
        handler: handler,
    };
}

/**
 * Custom type guard for {@link OnceEventHandler}.
 * @param value Any value
 * @returns True if the value is a OnceEventHandler.
 */
export function isOnceEventHandler(value: any): value is OnceEventHandler<any> {
    return typeof value === "object" && value.type && value.type === "once";
}
