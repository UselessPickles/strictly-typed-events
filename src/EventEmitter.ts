import {
    AnyFunction,
    EventsConstraint,
    EventNames,
    EventSource,
    SubscriptionCanceller,
    EventEmitProxy,
    SubscriptionOptions,
} from "./types.private";

/**
 * Internal represenations of a single subscription to a single event.
 */
interface EventSubscription<Events extends EventsConstraint<Events>> {
    /**
     * The handler for the event that is called whenever the event is emitted.
     */
    handler: Events[EventNames<Events>];
    /**
     * Subscription options.
     */
    options: SubscriptionOptions;
}

/**
 * Manages subscriptions to, and emitting of, events.
 * - Call methods of {@link EventEmitter#emit} to emit calls to all
 * subscribed handlers of an event.
 * - Call {@link EventEmitter#on} to subscribe to one or more events.
 * - Call the function returned by {@link EventEmitter#on} to cancel
 * the subscription.
 * - Expose an EventEmitter typecast to {@link EventSource} to restrict
 * consuming code to subscribing only (keep the emitting part private).
 *     - See {@link EventEmitter#asEventSource}.
 *     - See {@link EventSourceType}
 * - Consider extending {@link WithEventEmitter} to more conveniently make
 * your class an EventSource without publicly exposing the means to emit events.
 * NOTE: You must explicitly provide an interface for your events as the Events
 *       template parameter.
 * @template Events - An interface/type containing only methods, where each method
 *           name is the event name, and the method signatures is the signature
 *           for handlers of the event.
 * @example
 * ```
 * class MyClass {
 *     // Private EventEmitter gives your class the ability to emit
 *     // events.
 *     private emitter = new EventEmitter<{
 *         // Event definitions here.
 *         // Add TSDoc comment here to explain when this event is called,
 *         // document params, etc.
 *         nameChanged(name: string): void;
 *     }>();
 *
 *     // Expose the EventEmitter publicly, but only as an EventSource,
 *     // so external code can only subscribe to events.
 *     // Using asEventSource() allows the `events` field's type to be
 *     // conveniently inferred, rather than needing to manually specify its
 *     // type correctly.
 *     public events = this.emitter.asEventSource();
 *
 *     public setName(name: string): void {
 *         this.name = name;
 *         // emit the "nameChanged" event with the new name
 *         this.emitter.emit.nameChanged(name);
 *     }
 * }
 *
 * // Sample instance
 * const myInstance = new MyClass("Bob");
 *
 * // Subscribe to an event
 * const cancel = myInstance.events.on(
 *     "nameChanged",
 *     (name) => {
 *         console.log(name);
 *     }
 * );
 *
 * // Trigger the event to be emitted, which will execute the above event
 * // handler
 * myInstance.setName("Joe");
 *
 * // Cancel the subscription
 * cancel();
 * ```
 */
export class EventEmitter<Events extends EventsConstraint<Events>>
    implements EventSource<Events> {
    /**
     * A convenient proxy for emitting to all subscribed handlers of any event.
     * For each event defined by the Events interface, a method of the same name,
     * and same parameters signature, exists on this object that will call
     * all subscribed handlers of that event.
     * NOTE: The return type of every method on this proxy is `void`, regardless
     *       of the return type for the corresponding event.
     */
    public readonly emit: EventEmitProxy<Events>;

    /**
     * Map of event name -> map of subscription ID -> event subscription info
     */
    private readonly subscriptions: Partial<
        Record<string, Record<string, EventSubscription<Events>>>
    > = {};

    /**
     * Incrementing number used to create unique subscription IDs.
     */
    private nextSubscriptionIdNumber = 0;

    /**
     * Creates an implementation of an event emit method for the
     * {@link #emit} property.
     *
     * @param eventName - A valid event name.
     * @returns A function that, when called, will call all subscibed handlers
     *          for the specified event, forwarding all arguments.
     */
    private createEventHandlerCaller(
        eventName: EventNames<Events>
    ): () => void {
        // NOTE: Avoiding using an arrow function here to optimize the
        //       transpiled code.
        // tslint:disable:variable-name
        const _this = this;
        // tslint:disable:only-arrow-functions
        return function (): void {
            const eventSubscriptions = _this.subscriptions[eventName] || {};
            // NOTE: Avoiding for(in) of Object.keys().forEach() here to
            //       optimize the transpiled code.
            for (const subscriptionId in eventSubscriptions) {
                if (!eventSubscriptions.hasOwnProperty(subscriptionId)) {
                    continue;
                }

                const subscription = eventSubscriptions[subscriptionId];

                if (subscription.options.once) {
                    _this.cancel(subscriptionId, eventName);
                }

                subscription.handler.apply(
                    undefined,
                    // Ugly typecast necessary to directly pass arguments
                    // through rather than spreading arguments (...arguments),
                    // which would transpile to unnecessary creation of a new array.
                    (arguments as unknown) as any[]
                );
            }
        };
    }

    /**
     * An implementation for the `get` handler of a Proxy used to implement
     * the {@link #emit} property.
     * Dynamically creates/caches/returns an implementation of an "emit" method
     * for the specified event.
     * @param target - A reference to the `emit` property.
     * @param eventName - The name of the event whose emit method is being accessed.
     * @returns The implementation of the emit method for the specified event.
     */
    private emitProxyGet(
        target: EventEmitProxy<Events>,
        eventName: EventNames<Events>
    ): () => void {
        // If this eventName property has never been accessed before, then create
        // and cache its implementation.
        if (!target[eventName]) {
            // NOTE: Avoiding using an arrow function here to optimize the
            //       transpiled code.
            (target[eventName] as AnyFunction) = this.createEventHandlerCaller(
                eventName
            );
        }

        return target[eventName];
    }

    /**
     * @param options - Configuration options for the events.
     */
    public constructor() {
        this.emit = new Proxy({} as EventEmitProxy<Events>, {
            get: this.emitProxyGet.bind(this),
        });
    }

    /**
     * Convenience method that typecasts this EventEmitter to an EventSource
     * to expose only the means to subscribe to events, without exposing the
     * means to emit events.
     *
     * See also: {@link EventSourceType}
     *
     * @returns - This EventEmitter, typecast as an EventSource.
     * @example
     * ```
     * class MyClass {
     *     // Private EventEmitter gives your class the ability to emit
     *     // events.
     *     private emitter = new EventEmitter<{
     *         nameChanged(name: string): void;
     *     }>();
     *
     *     // Expose the EventEmitter publicly, but only as an EventSource,
     *     // so external code can only subscribe to events.
     *     // Using asEventSource() allows the `events` field's type to be
     *     // conveniently inferred, rather than needing to manually specify its
     *     // type correctly.
     *     public events = this.emitter.asEventSource();
     * }
     * ```
     */
    public asEventSource(): EventSource<Events> {
        return this;
    }

    /**
     * @override
     * @inheritdoc
     */
    public on<EventName extends EventNames<Events>>(
        name: EventName,
        handler: Events[EventName],
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    /**
     * @override
     * @inheritdoc
     */
    public on(
        handlers: Partial<Events>,
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    public on(
        eventNameOrHandlers: EventNames<Events> | Partial<Events>,
        handlerOrOptions: Events[EventNames<Events>] | SubscriptionOptions = {},
        maybeOptions: SubscriptionOptions = {}
    ): SubscriptionCanceller {
        const subscriptionId = `subscription_${this
            .nextSubscriptionIdNumber++}`;

        // Normalize params from overloaded signatures
        let handlers: Partial<Events>;
        let options: SubscriptionOptions;
        if (typeof eventNameOrHandlers === "string") {
            handlers = {};
            handlers[
                eventNameOrHandlers as EventNames<Events>
            ] = handlerOrOptions as Events[EventNames<Events>];
            options = maybeOptions;
        } else {
            handlers = eventNameOrHandlers as Partial<Events>;
            options = handlerOrOptions as SubscriptionOptions;
        }

        // NOTE: Avoiding for(in) of Object.keys().forEach() here to
        //       optimize the transpiled code.
        for (const eventName in handlers) {
            if (!handlers.hasOwnProperty(eventName) || !handlers[eventName]) {
                continue;
            }

            const handler = handlers[eventName]!;

            // Store the subscription
            if (!this.subscriptions[eventName]) {
                this.subscriptions[eventName] = {};
            }
            this.subscriptions[eventName]![subscriptionId] = {
                handler: handler,
                options: options,
            };
        }

        // NOTE: Avoiding using an arrow function here to optimize the
        //       transpiled code.
        return this.cancel.bind(this, subscriptionId);
    }

    /**
     * Cancels a subscription.
     * If only a subscription ID is provided, then cancels the entire
     * subscription to all events.
     * If the optional event name is provided, then only the subscription to the
     * one event is canceled (all other event handlers from the original
     * subscription remain active).
     *
     * Silently ignores invalid subscription IDs, eventNames, and combinations
     * of the two that are invalid/irrelevant (e.g., cancelling a subscription
     * that was already cancelled; cancelling a subscription to a specific
     * event for which the original subscription was not handling, etc.).
     *
     * @param subscriptionId - A subscription ID.
     * @param eventName - Name of a specific event to cancel. Unspecified/undefined
     *        to unsubscribe all event handlers in the subscription.
     */
    private cancel(
        subscriptionId: string,
        eventName?: EventNames<Events>
    ): void {
        if (eventName) {
            if (this.subscriptions[eventName]) {
                delete this.subscriptions[eventName]![subscriptionId];
            }
        } else {
            for (const subscribedEventName in this.subscriptions) {
                if (this.subscriptions.hasOwnProperty(subscribedEventName)) {
                    delete this.subscriptions[subscribedEventName]![
                        subscriptionId
                    ];
                }
            }
        }
    }
}
