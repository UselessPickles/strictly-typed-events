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
 * An interface for a proxy for publishing events for a given Events interface.
 * For each event defined in the Event interface, this proxy has an identically
 * named method used to publish to all subscribed handlers for that event.
 * The signature of each method is nearly identical to that of the corresponding
 * event, except that the return type is `void`.
 * @template Events - an Events interface (see {@link EventsConstraint}).
 */
export type EventPublishProxy<Events extends EventsConstraint<Events>> = {
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
    /**
     * If true, then event handlers in this subscription will NOT be called
     * automatically upon subscribing.
     * NOTE: Only relevant if the EventPublisher is configured to call the event
     * handler in an [onSubscribe handler]{@link EventOptions#onSubscribe}.
     */
    skipOnSubscribe?: boolean;
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
    subscribe<EventName extends EventNames<Events>>(
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
    subscribe(
        handlers: Partial<Events>,
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
}

/**
 * Helper type used to infer the exact {@link EventSource} type from any type that
 * extends EventSource.
 * This is useful for deriving the EventSource type from an existing
 * {@link EventPublisher} without explicitly knowing the Events interface that
 * was used.
 *
 * See also: {@link EventPublisher#asEventSource}
 *
 * @example
 * ```
 * class MyClass {
 *     // Private EventPublisher gives your class the ability to publish
 *     // events.
 *     private eventPublisher = new EventPublisher<{
 *         onNameChange(name: string): void;
 *     }>();
 *
 *     // Use EventSourceType<> to extract the correct EventSource type from
 *     // the private `eventPublisher`.
 *     public getEventSource(): EventSourceType<MyClass["eventPublisher"]> {
 *         return this.eventPublisher;
 *     }
 *  }
 * ```
 */
export type EventSourceType<T extends EventSource<any>> = T extends EventSource<
    infer Events
>
    ? EventSource<Events>
    : never;

/**
 * Configuration options for a single event.
 * @template Handler - The exact function signature for the handler of a particular event.
 */
export interface EventOptions<Handler extends AnyFunction> {
    /**
     * Called whenever a new subscription to this event is created.
     * The implementation may choose to call the supplied handler to immediately
     * "publish" the event to the newly subscribed handler.
     * NOTE: any particular subscription may choose to opt out of this via
     * {@link SubscriptionOptions#skipOnSubscribe}.
     * @param handler - Call this to publish to the new handler.
     *        Returns the return value of the handler.
     */
    onSubscribe?(handler: Handler): void;
}

/**
 * Configuration options for all events of an Event interface.
 * For each event defined in the Event interface, and identically named
 * optional property exists to specify options for that event.
 * @template Events - an Events interface (see {@link EventsConstraint}).
 */
export type EventsOptions<Events extends EventsConstraint<Events>> = {
    readonly [P in EventNames<Events>]?: EventOptions<Events[P]>;
};
