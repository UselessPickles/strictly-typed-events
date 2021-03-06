// tslint:disable:no-unused-expression
// NOTE: import from root/index to test against publicly exported types
import { EventEmitter, SubscriptionCanceller, EventSource } from ".";
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
const eventEmitter = new EventEmitter<Events>();

// properties
{
    // `emit` is similar to `Events` type, but readonly, and all methods return `void`
    expectType<
        Readonly<{
            // return type lost here (intentionally)
            foo(a: number, b: boolean): void;
            bar(): void;
        }>
    >(eventEmitter.emit);
}

// asEventSource()
{
    expectType<EventSource<Events>>(eventEmitter.asEventSource());
}

// subscribe()
{
    // subscribe with invalid event name
    expectError(
        eventEmitter.on({
            bad: () => {
                // empty
            },
        })
    );

    // subscribe with partial handlers object, no options
    eventEmitter.on({
        foo: (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
            return true;
        },
    });

    // subscribe with partial handlers object, partial options
    eventEmitter.on(
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
        eventEmitter.on("broken", () => {
            // empty
        })
    );

    // subscribe with event name, no options
    eventEmitter.on("foo", (a, b) => {
        expectType<number>(a);
        expectType<boolean>(b);
        return true;
    });

    // subscribe with event name, partial options
    eventEmitter.on(
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

    // returns a SubscriptionCanceller
    expectType<SubscriptionCanceller>(eventEmitter.on("bar", () => undefined));
}
