import {
    AnyEventFunction,
    AnyEventHandler,
    EventsConstraint,
    EventHandler,
    EventHandlers,
    EventNames,
    EventSource,
    SubscriptionCanceller,
    SubscriptionOptions,
} from "./types.private";

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
     */
    public readonly emit: Readonly<Events>;

    /**
     * Map of event name -> map of subscription ID -> event handler
     */
    private readonly handlers: Partial<
        Record<string, Record<string, AnyEventHandler>>
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
    ): AnyEventFunction {
        // NOTE: Avoiding using an arrow function here to optimize the
        //       transpiled code (particularly with regards to an ...args param
        //       versus the native arguments keyword).
        // tslint:disable:variable-name
        const _this = this;
        // tslint:disable:only-arrow-functions
        return function (): void {
            const eventSubscriptions = _this.handlers[eventName];

            if (!eventSubscriptions) {
                return;
            }

            // NOTE: Avoiding for(in) of Object.keys().forEach() here to
            //       optimize the transpiled code.
            for (const subscriptionId in eventSubscriptions) {
                if (!eventSubscriptions.hasOwnProperty(subscriptionId)) {
                    continue;
                }

                eventSubscriptions[subscriptionId].apply(
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
        target: Events,
        eventName: EventNames<Events>
    ): AnyEventFunction {
        // If this eventName property has never been accessed before, then create
        // and cache its implementation.
        if (!target[eventName]) {
            // NOTE: Avoiding using an arrow function here to optimize the
            //       transpiled code.
            target[eventName] = this.createEventHandlerCaller(
                eventName
            ) as Events[EventNames<Events>];
        }

        return target[eventName];
    }

    /**
     * @param options - Configuration options for the events.
     */
    public constructor() {
        this.emit = new Proxy({} as Events, {
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
        handler: EventHandler<Events[EventName]>,
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    /**
     * @override
     * @inheritdoc
     */
    public on(
        handlers: Partial<EventHandlers<Events>>,
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    public on(
        eventNameOrHandlers:
            | EventNames<Events>
            | Partial<EventHandlers<Events>>,
        handlerOrOptions:
            | EventHandler<Events[EventNames<Events>]>
            | SubscriptionOptions = {},
        maybeOptions: SubscriptionOptions = {}
    ): SubscriptionCanceller {
        const subscriptionId = `subscription_${this
            .nextSubscriptionIdNumber++}`;

        // Normalize params from overloaded signatures
        let handlers: Partial<EventHandlers<Events>>;
        let options: SubscriptionOptions;
        if (typeof eventNameOrHandlers === "string") {
            handlers = {};
            handlers[eventNameOrHandlers] = handlerOrOptions as AnyEventHandler;
            options = maybeOptions;
        } else {
            handlers = eventNameOrHandlers;
            options = handlerOrOptions as SubscriptionOptions;
        }

        // NOTE: Avoiding for(in) of Object.keys().forEach() here to
        //       optimize the transpiled code.
        for (const eventName in handlers) {
            if (
                !handlers.hasOwnProperty(eventName) ||
                !handlers[eventName as EventNames<Events>]
            ) {
                continue;
            }

            let handler = handlers[
                eventName as EventNames<Events>
            ]! as AnyEventHandler;
            if (options.once) {
                handler = this.createOnceHandler(
                    handler,
                    subscriptionId,
                    eventName as EventNames<Events>
                );
            }

            // Store the subscription
            if (!this.handlers[eventName]) {
                this.handlers[eventName] = {};
            }
            this.handlers[eventName]![subscriptionId] = handler;
        }

        return this.cancel.bind(this, subscriptionId);
    }

    /**
     * Wraps a handler function in a new handler function that automatically
     * unsubscribes itself before calling the underlying handler.
     * @param handler - An event handler.
     * @param subscriptionId - ID of the subscription that this handler belongs to.
     * @param eventName - Name of the event that this handler is for.
     * @returns A function that will unsubscribe the subscriptionId/eventName
     *          combination before calling the handler.
     */
    private createOnceHandler(
        handler: AnyEventHandler,
        subscriptionId: string,
        eventName: EventNames<Events>
    ): AnyEventHandler {
        // NOTE: Avoiding using an arrow function here to optimize the
        //       transpiled code (particularly with regards to an ...args param
        //       versus the native arguments keyword).
        const _this = this;
        return function (): void {
            // NOTE: Safe to assume that _this.handlers[eventName] is defined,
            // because this code can only ever possibly be called for a
            // subscription that was created within this class, and it's
            // impossible for this to get executed before the handler is stored
            // in the structure.
            delete _this.handlers[eventName]![subscriptionId];
            handler.apply(
                undefined,
                // Ugly typecast necessary to directly pass arguments
                // through rather than spreading arguments (...arguments),
                // which would transpile to unnecessary creation of a new array.
                (arguments as unknown) as any[]
            );
        };
    }

    /**
     * Cancels a subscription.
     *
     * Silently ignores invalid subscription IDs (e.g., cancelling a
     * subscription that was already cancelled).
     *
     * @param subscriptionId - A subscription ID.
     */
    private cancel(subscriptionId: string): void {
        for (const subscribedEventName in this.handlers) {
            if (this.handlers.hasOwnProperty(subscribedEventName)) {
                delete this.handlers[subscribedEventName]![subscriptionId];
            }
        }
    }
}
