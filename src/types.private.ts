/**
 * General/shared types for this project.
 * This file's exports are private to the project.
 * Some exports are made public by being re-exported in `types.public.ts`.
 */

/**
 * A general function signature type for any valid event signature.
 * A function with any arguments whose return type is void (because return
 * value of event handlers are ignored).
 */
export type AnyEventFunction = (...args: any) => void;

/**
 * Converts an EventFunction type to an EventHandler type by changing
 * the return type to allow `Promise<void>`.
 * This allows for handlers to be implemented as async functions.
 * @template EventFunction - an Event function (see {@link AnyEventFunction}).
 */
export type EventHandler<EventFunction extends AnyEventFunction> = (
    ...args: Parameters<EventFunction>
) => void | Promise<void>;

/**
 * A general function signature type for any valid event handler signature.
 * This is slightly different than `AnyEventFunction` in that the return type
 * may also be `Promise<void>`, which allows for handlers to be implemented
 * as async functions.
 */
export type AnyEventHandler = EventHandler<AnyEventFunction>;

/**
 * Wrapper around an EventHandler to indicate that it should be used only one
 * time, then automatuically cancel its own subscription.
 * @template EventFunction - an Event function (see {@link AnyEventFunction}).
 */
export interface OnceEventHandler<EventFunction extends AnyEventFunction> {
    /**
     * Marker to identify this as a OnceEventHandler.
     */
    type: "once";
    /**
     * The underlying EventHandler.
     */
    handler: EventHandler<EventFunction>;
}

/**
 * Used as a constraint for template parameters that are expected to be an
 * Events interface.
 * An Events interface is one where the types of all string properties are
 * non-optional `AnyEventFunction`.
 * @template Events - A potentially valid Events interface.
 */
export type EventsConstraint<Events> = Record<
    Extract<keyof Events, string | symbol>,
    AnyEventFunction
>;

/**
 * Extracts the type of all event names from an Events interface.
 * NOTE: This includes event names that are `symbol` types!
 * See also: {@link StringEventNames}.
 * @template Events - an Events interface (see {@link EventsConstraint}).
 */
export type EventNames<Events extends EventsConstraint<Events>> = Extract<
    keyof Events,
    string | symbol
>;

/**
 * Extracts the type of only `string` based event names from an Events interface.
 * See also: {@link EventNames}.
 * @template Events - an Events interface (see {@link EventsConstraint}).
 */
export type StringEventNames<Events extends EventsConstraint<Events>> = Extract<
    keyof Events,
    string
>;

/**
 * Interface of valid event handler function signatures for a given Events
 * interface.
 * While all function signatures in an Events interface must return void,
 * corresponding functions signatures in the EventHandlers interface may
 * also return `Promise<void>`.
 * This allows for subscription to events with async handler implementations.
 * This interface also allows for special {@link OnceEventHandler} wrappers
 * around event handler functions to indicate a one-time handler.
 * @template Events - an Events interface (see {@link EventsConstraint}).
 */
export type EventHandlers<Events extends EventsConstraint<Events>> = {
    [P in Exclude<EventNames<Events>, symbol>]:
        | EventHandler<Events[P]>
        | OnceEventHandler<Events[P]>;
};

/**
 * Callback function used to cancel a subscription.
 */
export type SubscriptionCanceller = () => void;

/**
 * A source of events, which supports subscriptions to those events.
 * This interface exposes only the means to subscribe to events, without
 * exposing the means to publish events.
 * @template Events - an Events interface (see {@link EventsConstraint}).
 */
export interface EventSource<Events extends EventsConstraint<Events>> {
    /**
     * Subscribe to a single event.
     * @param eventName - A valid event name for the Events interface.
     * @param handler - A handler function for the specified event.
     * @param options - Subscription options.
     * @returns A callback function that, when called, will cancel this subscription.
     */
    on<EventName extends EventNames<Events>>(
        eventName: EventName,
        handler: EventHandler<Events[EventName]>
    ): SubscriptionCanceller;

    /**
     * Subscribe to a single event, but only for one emit of the event.
     * @param eventName - A valid event name for the Events interface.
     * @param handler - A handler function for the specified event.
     * @param options - Subscription options.
     * @returns A callback function that, when called, will cancel this subscription.
     */
    once<EventName extends EventNames<Events>>(
        eventName: EventName,
        handler: EventHandler<Events[EventName]>
    ): SubscriptionCanceller;

    /**
     * Subscribe to one or more events as a single subscription.
     * This conveniently allows you to later cancel the subscription to multiple
     * events with a single cancel.
     * NOTE: This only supports event names that are strings. For event names that
     *       are unique symbols, you must use {@link #on} or {@link #once}.
     * @param handlers - An object containing handler implementations for any
     *        number of events defined in the Events interface, keyed by event name.
     *        NOTE: Handlers are called as standalone functions without a `this`
     *              context, so do not depend on `this` being a reference to the
     *              `handlers` object you provide here.
     * @param options - Subscription options.
     *        (applied to ALL event handlers in the subscription)
     * @returns A callback function that, when called, will cancel this subscription.
     */
    subscribe(handlers: Partial<EventHandlers<Events>>): SubscriptionCanceller;
}

/**
 * Helper type used to extract an EventHandlers interface from any {@link EventSource}.
 * this is useful, for example, if you need to reference the function signature
 * type of one of the event handlers of an EventSource
 *
 * @template T - An EventSource type.
 * @example
 * ```ts
 * // An `EventSource` where you don't have direct knowledge of the Events
 * // interface it uses, or its Events interface was inlined at creation.
 * declare const eventSource: EventSource<[unknown]>
 *
 * // Use `EventHandlersType` to extract the type of an event handler so you can
 * // pre-define a type-safe handler for the event.
 * const nameChangedHandler: EventHandlersType<typeof eventSource>["nameChanged"] = (name) => {
 *     // parameter types are inferred correctly and return type is checked
 * };
 * ```
 */
export type EventHandlersType<
    T extends EventSource<any>
> = T extends EventSource<infer Events>
    ? {
          [P in EventNames<Events>]: EventHandler<Events[P]>;
      }
    : never;

/**
 * Helper type used to infer the exact {@link EventSource} type from any type that
 * extends EventSource.
 * This is useful for deriving the EventSource type from an existing
 * {@link EventEmitter} without explicitly knowing the Events interface that
 * was used.
 *
 * See also: {@link EventEmitter#asEventSource}
 *
 * @template T - An EventSource type.
 * @example
 * ```
 * class MyClass {
 *     // Private eventEmitter gives your class the ability to publish
 *     // events.
 *     private eventEmitter = new EventEmitter<{
 *         nameChanged(name: string): void;
 *     }>();
 *
 *     // Use EventSourceType<> to extract the correct EventSource type from
 *     // the private `eventEmitter`.
 *     public getEventSource(): EventSourceType<MyClass["eventEmitter"]> {
 *         return this.eventEmitter;
 *     }
 *  }
 * ```
 */
export type EventSourceType<T extends EventSource<any>> = T extends EventSource<
    infer Events
>
    ? EventSource<Events>
    : never;
