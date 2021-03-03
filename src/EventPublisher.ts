import {
    AnyFunction,
    EventsConstraint,
    EventNames,
    EventSource,
    SubscriptionCanceller,
    EventPublishProxy,
    SubscriptionOptions,
    EventsOptions,
} from "./types.private";

interface EventSubscription<Events extends EventsConstraint<Events>> {
    handler: Events[EventNames<Events>];
    context: Partial<Events>;
    options: SubscriptionOptions;
}

export class EventPublisher<Events extends EventsConstraint<Events>>
    implements EventSource<Events> {
    /**
     * TODO
     */
    public readonly publish: EventPublishProxy<Events>;

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

    private createEventHandlerCaller(
        eventName: EventNames<Events>
    ): () => void {
        // tslint:disable:variable-name
        const _this = this;
        // tslint:disable:only-arrow-functions
        return function (): void {
            const eventSubscriptions = _this.subscriptions[eventName] || {};
            for (const subscriptionId in eventSubscriptions) {
                if (!eventSubscriptions.hasOwnProperty(subscriptionId)) {
                    continue;
                }

                const subscription = eventSubscriptions[subscriptionId];

                if (subscription.options.once) {
                    _this.cancelSubscription(subscriptionId, eventName);
                }

                subscription.handler.apply(
                    subscription.context,
                    (arguments as unknown) as any[]
                );
            }
        };
    }

    private publishProxyGet(
        target: EventPublishProxy<Events>,
        eventName: EventNames<Events>
    ): () => void {
        if (!target[eventName]) {
            (target[eventName] as AnyFunction) = this.createEventHandlerCaller(
                eventName
            );
        }

        return target[eventName];
    }

    public constructor(private readonly options: EventsOptions<Events> = {}) {
        this.publish = new Proxy({} as EventPublishProxy<Events>, {
            get: this.publishProxyGet.bind(this),
        });
    }

    public subscribe<EventName extends EventNames<Events>>(
        name: EventName,
        handler: Events[EventName],
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    public subscribe(
        Events: Partial<Events>,
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    public subscribe(
        eventNameOrHandlers: EventNames<Events> | Partial<Events>,
        handlerOrOptions: Events[EventNames<Events>] | SubscriptionOptions = {},
        maybeOptions: SubscriptionOptions = {}
    ): SubscriptionCanceller {
        const subscriptionId = `subscription_${this
            .nextSubscriptionIdNumber++}`;
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

        for (const eventName in handlers) {
            if (!handlers.hasOwnProperty(eventName) || !handlers[eventName]) {
                continue;
            }

            const handler = handlers[eventName]!;

            if (!this.subscriptions[eventName]) {
                this.subscriptions[eventName] = {};
            }

            this.subscriptions[eventName]![subscriptionId] = {
                handler: handler,
                options: options,
                context: handlers,
            };

            const eventOptions = this.options[eventName];
            if (
                eventOptions &&
                eventOptions.onSubscribe &&
                !options.skipOnSubscribe
            ) {
                const _this = this;
                (eventOptions.onSubscribe as AnyFunction)(function (): any {
                    if (options.once) {
                        _this.cancelSubscription(subscriptionId, eventName);
                    }

                    return handler.apply(
                        handlers,
                        (arguments as unknown) as any[]
                    );
                });
            }
        }

        return this.cancelSubscription.bind(this, subscriptionId);
    }

    private cancelSubscription(
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
