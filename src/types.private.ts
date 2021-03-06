/**
 * General/shared types for this project.
 * This file's exports are private to the project.
 * Some exports are made public by being re-exported in `types.public.ts`.
 */

/**
 * A function that accepts any params and returns any type.
 */
export type AnyFunction = (...args: any) => void;

/**
 * Used as a constraint for template parameters that are expected to be an
 * Events interface.
 * An Events interface is one where the types of all string properties are
 * non-optional functions.
 * @template Events - A potentially valid Events interface.
 */
export type EventsConstraint<Events> = Record<
    Extract<keyof Events, string>,
    AnyFunction
>;

/**
 * Extracts all event names from an Events interface as a string literal
 * union type.
 * @template Events - an Events interface (see {@link EventsConstraint}).
 */
export type EventNames<Events extends EventsConstraint<Events>> = Extract<
    keyof Events,
    string
>;

/**
 * An interface for a proxy for emitting events for a given Events interface.
 * For each event defined in the Event interface, this proxy has an identically
 * named method used to publish to all subscribed handlers for that event.
 * The signature of each method is nearly identical to that of the corresponding
 * event, except that the return type is `void`.
 * @template Events - an Events interface (see {@link EventsConstraint}).
 */
export type EventEmitProxy<Events extends EventsConstraint<Events>> = {
    readonly [P in EventNames<Events>]: (
        ...args: Parameters<Events[P]>
    ) => void;
};

/**
 * Options for a subscription.
 * Applies to ALL event handlers in the subscription.
 */
export interface SubscriptionOptions {
    /**
     * If true, then each event handler in this subscription will automatically
     * unsubscribe itself after being called once.
     */
    once?: boolean;
}

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
     * @param name - A valid event name for the Events interface.
     * @param handler - A handler function for the specified event.
     * @param options - Subscription options.
     * @returns A callback function that, when called, will cancel this subscription.
     */
    on<EventName extends EventNames<Events>>(
        name: EventName,
        handler: Events[EventName],
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    /**
     * Subscribe to one or more events as a single subscription.
     * This conveniently allows you to later cancel the subscription to multiple
     * events with a single cancel.
     * @param handlers - An object containing handler implementations for any
     *        number of events defined in the Events interface, keyed by event name.
     * @param options - Subscription options.
     *        (applied to ALL event handlers in the subscription)
     * @returns A callback function that, when called, will cancel this subscription.
     */
    on(
        handlers: Partial<Events>,
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
}

/**
 * Helper type used to extract the Events interface from any {@link EventSource}.
 * this is useful, for example, if you need to reference the function signature
 * type of one of the events of an EventSource, but there is no publicly available
 * named typed for its Events interface.
 *
 * @template T - An EventSource type.
 * @example
 * ```ts
 * // An `EventSource` where you don't have direct knowledge of the Events
 * // interface it uses, or its Events interface was inlined at creation.
 * declare const eventSource: EventSource<[unknown]>
 *
 * // Use `EventsType` to extract the type of an event so you can
 * // pre-define a type-safe handler for the event.
 * const nameChangedHandler: EventsType<typeof eventSource>["nameChanged"] = (name) => {
 *     // parameter types are inferred correctly and return type is checked
 * };
 * ```
 */
export type EventsType<T extends EventSource<any>> = T extends EventSource<
    infer Events
>
    ? Events
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
