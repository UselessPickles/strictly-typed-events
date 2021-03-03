import { EventPublisher } from "./EventPublisher";
import {
    EventsOptions,
    EventsConstraint,
    EventSource,
    EventNames,
    SubscriptionOptions,
    SubscriptionCanceller,
} from "./types.private";

/**
 * Convenient base class to be inherited to make its parent a fully functional
 * {@link EventSource} implementation.
 * When inheriting from this class, your class will gain:
 * - A protected [publish]{@link WithEventPublisher#publish} property for publishing
 *   events to subscribers (just like {@link EventPublisher#publish}).
 * - A public [subscribe]{@link WithEventPublisher#subscribe} method for subscribing
 *   to your events.
 * NOTE: You must explicitly provide an interface for your events as the Events
 *       template parameter.
 * @template Events - An interface/type containing only methods, where each method
 *           name is the event name, and the method signatures is the signature
 *           for handlers of the event.
 * @example
 * ```
 * class MyEventSource extends WithEventPublisher<{
 *     // Event definitions here.
 *     // Add TSDoc comment here to explain when this event is called,
 *     // document params, etc.
 *     onNameChange(name: string): void;
 * }> {
 *     public constructor(private name: string) {
 *         super();
 *     }
 *
 *     public setName(name: string): void {
 *         this.name = name;
 *         // publish the "onNameChange" event with the new name
 *         this.publish.onNameChange(name);
 *     }
 * }
 *
 * // Sample instance
 * const myEventSource = new MyEventSource("Bob");
 *
 * // Subscribe to an event
 * myEventSource.subscribe("onNameChange", (name) => {
 *     console.log(name);
 * });
 *
 * // Trigger the event to be published, which will execute the above event
 * // handler
 * myEventSource.setName("Joe");
 * ```
 */
export class WithEventPublisher<Events extends EventsConstraint<Events>>
    implements EventSource<Events> {
    /**
     * The underlying implementation that handles all of the event publishing
     * and subscribing.
     */
    private eventPublisher: EventPublisher<Events>;

    /**
     * A convenient proxy for publishing to all subscribed handlers of any event.
     * For each event defined by the Events interface, a method of the same name,
     * and same parameters signature, exists on this object that will call
     * all subscribed handlers of that event.
     * NOTE: The return type of every method on this proxy is `void`, regardless
     *       of the return type for the corresponding event.
     */
    protected publish: EventPublisher<Events>["publish"];

    /**
     * @param options - Configuration options for the events.
     */
    constructor(options?: EventsOptions<Events>) {
        this.eventPublisher = new EventPublisher<Events>(options);
        this.publish = this.eventPublisher.publish;
    }

    /**
     * @override
     * @inheritdoc
     */
    public subscribe<EventName extends EventNames<Events>>(
        eventName: EventName,
        handler: Events[EventName],
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    /**
     * @override
     * @inheritdoc
     */
    public subscribe(
        handlers: Partial<Events>,
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    public subscribe(): SubscriptionCanceller {
        return this.eventPublisher.subscribe.apply(
            this.eventPublisher,
            arguments as any
        );
    }
}
