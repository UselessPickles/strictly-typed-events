import { isOnceEventHandler } from "./once";
import {
    EventsConstraint,
    EventSource,
    EventNames,
    EventHandler,
    AnyEventHandler,
    EventHandlers,
    SubscriptionCanceller,
} from "./types.private";

/**
 * A Partial implementation of the {@link EventSource} interface.
 * Extend this class and implement the {@link EventSource#on} method to easily
 * fully implement the EventSource interface.
 */
export abstract class AbstractEventSource<
    Events extends EventsConstraint<Events>
> implements EventSource<Events> {
    /**
     * @inheritdoc
     */
    public abstract on<EventName extends EventNames<Events>>(
        eventName: EventName,
        handler: EventHandler<Events[EventName]>
    ): SubscriptionCanceller;

    /**
     * @inheritdoc
     */
    public once<EventName extends EventNames<Events>>(
        eventName: EventName,
        handler: EventHandler<Events[EventName]>
    ): SubscriptionCanceller {
        // Wrap the handler in a function that will self-cancel when it is called
        // tslint:disable:only-arrow-functions
        const wrappedHandler = function (): void | Promise<void> {
            cancel();
            return handler.apply(
                undefined,
                (arguments as unknown) as Parameters<typeof handler>
            );
        };

        // Subscribe to the wrapped handler
        const cancel = this.on(eventName, wrappedHandler);
        return cancel;
    }

    /**
     * @inheritdoc
     */
    public onceAsPromise<EventName extends EventNames<Events>>(
        eventName: EventName
    ): Promise<Parameters<EventHandler<Events[EventName]>>> {
        return new Promise<Parameters<EventHandler<Events[EventName]>>>(
            (resolve) => {
                this.once(eventName, function (): void {
                    resolve.call(
                        undefined,
                        (arguments as unknown) as Parameters<
                            EventHandler<Events[EventName]>
                        >
                    );
                });
            }
        );
    }

    /**
     * @inheritdoc
     */
    public subscribe(
        handlers: Partial<EventHandlers<Events>>
    ): SubscriptionCanceller {
        // List of cancel functions for each individual event subscription
        const cancelFunctions: SubscriptionCanceller[] = [];

        // Get all property names from the handlers object, including
        // property symbols (for unique symbol event names).
        // ASSUMPTION: `handlers` should be a simple object containing ONLY
        // valid event names/handlers, so we should be able to safely assume
        // that ALL "own" property names/symbols must be valid event names.
        const eventNames = (Object.getOwnPropertyNames(
            handlers
        ) as EventNames<Events>[]).concat(
            Object.getOwnPropertySymbols(handlers) as EventNames<Events>[]
        );

        // Subscribe to each event individually in terms of `on()` or `once()`
        for (const eventName of eventNames) {
            if (!handlers.hasOwnProperty(eventName)) {
                continue;
            }

            const handler = handlers[eventName as keyof typeof handlers];

            if (!handler) {
                continue;
            }

            if (isOnceEventHandler(handler)) {
                cancelFunctions.push(
                    this.once(eventName as EventNames<Events>, handler.handler)
                );
            } else {
                cancelFunctions.push(
                    this.on(
                        eventName as EventNames<Events>,
                        handler as AnyEventHandler
                    )
                );
            }
        }

        // Return a cancel function that cancels all the individual subscriptions
        return () => {
            const length = cancelFunctions.length;
            for (let i = 0; i < length; ++i) {
                cancelFunctions[i]();
            }
        };
    }
}
