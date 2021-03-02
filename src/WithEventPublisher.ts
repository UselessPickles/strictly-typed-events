import {
    EventPublisher,
    EventsOptions,
    EventsConstraint,
    EventSource,
    EventNames,
    SubscriptionOptions,
} from "./EventPublisher";

export class WithEventPublisher<Events extends EventsConstraint<Events>>
    implements EventSource<Events> {
    private eventPublisher: EventPublisher<Events>;
    protected publish: EventPublisher<Events>["publish"];

    constructor(options?: EventsOptions<Events>) {
        this.eventPublisher = new EventPublisher<Events>(options);
        this.publish = this.eventPublisher.publish;
    }

    public subscribe<EventName extends EventNames<Events>>(
        eventName: EventName,
        handler: Events[EventName],
        options?: SubscriptionOptions
    ): string;
    public subscribe(
        handlers: Partial<Events>,
        options?: SubscriptionOptions
    ): string;
    public subscribe(): string {
        return this.eventPublisher.subscribe.apply(
            this.eventPublisher,
            arguments as any
        );
    }

    public unsubscribe(id: string, eventName?: EventNames<Events>): void {
        this.eventPublisher.unsubscribe(id, eventName);
    }
}
