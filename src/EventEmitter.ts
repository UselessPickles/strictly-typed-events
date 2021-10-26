import { AbstractEventSource } from "./AbstractEventSource";
import {
    AnyEventFunction,
    AnyEventHandler,
    EventsConstraint,
    EventHandler,
    EventNames,
    EventSource,
    SubscriptionCanceller,
} from "./types.private";

/**
 * Manages subscriptions to, and emitting of, events.
 * - Call methods of {@link EventEmitter#emit} to emit calls to all
 * subscribed handlers of an event.
 * - Call {@link EventEmitter#on} to subscribe to one or more events.
 * - Call the function returned by {@link EventEmitter#on} to cancel
 * the subscription.
 * - Expose an {@link EventSource} of this EventEmitter to restrict
 * consuming code to subscribing only (keep the emitting part private).
 *     - See {@link EventEmitter#toEventSource}.
 *     - See {@link EventSourceType}
 * - Consider extending {@link WithEventEmitter} to more conveniently make
 * your class an EventSource without publicly exposing the means to emit events.
 *
 * NOTE: You must explicitly provide an interface for your events as the Events
 *       template parameter.
 *
 * @typeParam Events - An interface/type containing only methods, where each method
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
 *     // Using toEventSource() allows the `events` field's type to be
 *     // conveniently inferred, rather than needing to manually specify its
 *     // type correctly.
 *     public events = this.emitter.toEventSource();
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
export class EventEmitter<
    Events extends EventsConstraint<Events>
> extends AbstractEventSource<Events> {
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
        Record<EventNames<Events>, Record<string, AnyEventHandler>>
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
     *
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
        super();
        this.emit = new Proxy({} as Events, {
            get: this.emitProxyGet.bind(this),
        });
    }

    /**
     * Creates a "readonly" version of this EventEmitter as an EventSource
     * implementation to expose only the means to subscribe to events, without
     * exposing the means to emit events.
     *
     * See also: {@link EventSourceType}
     *
     * @returns - A new EventSource that can be used subscribe to this
     *            EventEmitter's events..
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
     *     // Using toEventSource() allows the `events` field's type to be
     *     // conveniently inferred, rather than needing to manually specify its
     *     // type correctly.
     *     public events = this.emitter.toEventSource();
     * }
     * ```
     */
    public toEventSource(): EventSource<Events> {
        return {
            on: this.on.bind(this),
            once: this.once.bind(this),
            onceAsPromise: this.onceAsPromise.bind(this),
            subscribe: this.subscribe.bind(this),
        };
    }

    /**
     * @inheritdoc
     */
    public on<EventName extends EventNames<Events>>(
        eventName: EventName,
        handler: EventHandler<Events[EventName]>
    ): SubscriptionCanceller {
        const subscriptionId = `subscription_${this
            .nextSubscriptionIdNumber++}`;

        let eventHandlers = this.handlers[eventName];
        if (!eventHandlers) {
            eventHandlers = this.handlers[eventName] = {};
        }

        eventHandlers[subscriptionId] = handler;

        return this.cancel.bind(this, subscriptionId);
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
        for (const eventName in this.handlers) {
            if (this.handlers.hasOwnProperty(eventName)) {
                const eventHandlers = this.handlers[
                    eventName as EventNames<Events>
                ];

                if (eventHandlers) {
                    delete eventHandlers[subscriptionId];
                }
            }
        }
    }
}
