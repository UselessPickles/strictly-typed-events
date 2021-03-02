// tslint:disable:no-unused-expression
import { EventPublisher } from "./EventPublisher";
import { expectType, expectError } from "tsd";

// Sample Events interface for testing
interface Events {
    // Intentionally with typed parameters and non-void return type for testing
    foo(a: number, b: boolean): boolean;
    /**
     * Test!
     */
    bar(): void;
}

// shared instance for tests
const eventPublisher = new EventPublisher<Events>();

// constructor
{
    // invalid event name in options
    expectError(
        new EventPublisher<Events>({
            broken: {
                onSubscribe: () => {
                    // empty
                },
            },
        })
    );

    // "onSubscribe" option is typed properly
    new EventPublisher<Events>({
        foo: {
            onSubscribe: (handler) => {
                expectType<Events["foo"]>(handler);
                // return type is preserved here
                expectType<boolean>(handler(42, true));
            },
        },
    });
}

// properties
{
    // `publish` is similar to `Events` type, but readonly, and all methods return `void`
    expectType<
        Readonly<{
            // return type lost here (intentionally)
            foo(a: number, b: boolean): void;
            bar(): void;
        }>
    >(eventPublisher.publish);
}

// subscribe()
{
    // subscribe with invalid event name
    expectError(
        eventPublisher.subscribe({
            bad: () => {
                // empty
            },
        })
    );

    // subscribe with partial handlers object, no options
    eventPublisher.subscribe({
        foo: (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
            return true;
        },
    });

    // subscribe with partial handlers object, partial options
    eventPublisher.subscribe(
        {
            foo: (a, b) => {
                expectType<number>(a);
                expectType<boolean>(b);
                return true;
            },
        },
        {
            once: true,
        }
    );

    // subscribe with invalid event name
    expectError(
        eventPublisher.subscribe("broken", () => {
            // empty
        })
    );

    // subscribe with event name, no options
    eventPublisher.subscribe("foo", (a, b) => {
        expectType<number>(a);
        expectType<boolean>(b);
        return true;
    });

    // subscribe with event name, partial options
    eventPublisher.subscribe(
        "foo",
        (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
            return true;
        },
        {
            once: true,
        }
    );
}

// unsubscribe()
{
    // unsubscribe from invalid event name
    expectError(eventPublisher.unsubscribe("id", "invalid!"));
}
