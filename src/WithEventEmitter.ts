import { EventEmitter } from "./EventEmitter";
import {
    EventsConstraint,
    EventHandler,
    EventHandlers,
    EventSource,
    EventNames,
    SubscriptionOptions,
    SubscriptionCanceller,
} from "./types.private";

/**
 * Convenient base class to be inherited to make its parent a fully functional
 * {@link EventSource} implementation.
 * When inheriting from this class, your class will gain:
 * - A protected [emit]{@link WithEventEmitter#emit} property for emitting
 *   events to subscribers (just like {@link EventEmitter#emit}).
 * - A public [subscribe]{@link WithEventEmitter#subscribe} method for subscribing
 *   to your events.
 * NOTE: You must explicitly provide an interface for your events as the Events
 *       template parameter.
 * @template Events - An interface/type containing only methods, where each method
 *           name is the event name, and the method signatures is the signature
 *           for handlers of the event.
 * @example
 * ```
 * class MyEventSource extends WithEventEmitter<{
 *     // Event definitions here.
 *     // Add TSDoc comment here to explain when this event is called,
 *     // document params, etc.
 *     nameChanged(name: string): void;
 * }> {
 *     public constructor(private name: string) {
 *         super();
 *     }
 *
 *     public setName(name: string): void {
 *         this.name = name;
 *         // emit the "nameChanged" event with the new name
 *         this.emit.nameChanged(name);
 *     }
 * }
 *
 * // Sample instance
 * const myEventSource = new MyEventSource("Bob");
 *
 * // Subscribe to an event
 * myEventSource.on("nameChanged", (name) => {
 *     console.log(name);
 * });
 *
 * // Trigger the event to be emitted, which will execute the above event
 * // handler
 * myEventSource.setName("Joe");
 * ```
 */
export class WithEventEmitter<Events extends EventsConstraint<Events>>
    implements EventSource<Events> {
    /**
     * The underlying implementation that handles all of the event emitting
     * and subscribing.
     */
    private eventEmitter: EventEmitter<Events>;

    /**
     * A convenient proxy for emitting to all subscribed handlers of any event.
     * For each event defined by the Events interface, a method of the same name,
     * and same parameters signature, exists on this object that will call
     * all subscribed handlers of that event.
     * NOTE: The return type of every method on this proxy is `void`, regardless
     *       of the return type for the corresponding event.
     */
    protected emit: EventEmitter<Events>["emit"];

    /**
     * @param options - Configuration options for the events.
     */
    constructor() {
        this.eventEmitter = new EventEmitter<Events>();
        this.emit = this.eventEmitter.emit;
    }

    /**
     * @override
     * @inheritdoc
     */
    public on<EventName extends EventNames<Events>>(
        eventName: EventName,
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
    public on(): SubscriptionCanceller {
        return this.eventEmitter.on.apply(this.eventEmitter, arguments as any);
    }
}
