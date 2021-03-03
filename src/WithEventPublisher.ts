import { EventPublisher } from "./EventPublisher";
import {
    EventsOptions,
    EventsConstraint,
    EventSource,
    EventNames,
    SubscriptionOptions,
    SubscriptionCanceller,
} from "./types.private";

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
    ): SubscriptionCanceller;
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
