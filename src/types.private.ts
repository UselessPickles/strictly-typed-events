/**
 * General/shared types for this project.
 * This file's exports are private to the project.
 * Some exports are made public by being re-exported in `types.public.ts`.
 */

/**
 * A function that accepts any params and returns any type.
 */
export type AnyFunction = (...args: any) => void;

export type EventsConstraint<Events> = Record<
    Extract<keyof Events, string>,
    AnyFunction
>;

export type EventNames<Events extends EventsConstraint<Events>> = Extract<
    keyof Events,
    string
>;

export type EventPublishProxy<Events extends EventsConstraint<Events>> = {
    readonly [P in EventNames<Events>]: (
        ...args: Parameters<Events[P]>
    ) => void;
};

export interface SubscriptionOptions {
    once?: boolean;
    skipOnSubscribe?: boolean;
}

export type SubscriptionCanceller = () => void;

export interface EventSource<Events extends EventsConstraint<Events>> {
    subscribe<EventName extends EventNames<Events>>(
        name: EventName,
        handler: Events[EventName],
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
    subscribe(
        Events: Partial<Events>,
        options?: SubscriptionOptions
    ): SubscriptionCanceller;
}

export interface EventOptions<Handler extends AnyFunction> {
    onSubscribe?(handler: Handler): void;
}

export type EventsOptions<Events extends EventsConstraint<Events>> = {
    readonly [P in EventNames<Events>]?: EventOptions<Events[P]>;
};
