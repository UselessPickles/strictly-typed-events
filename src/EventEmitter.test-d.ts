// tslint:disable:no-unused-expression
// NOTE: import from root/index to test against publicly exported types
import { EventEmitter, SubscriptionCanceller, EventSource } from ".";
import { expectType, expectError } from "tsd";

// Sample Events interface for testing
interface Events {
    foo(a: number, b: boolean): void;
    bar(): void;
}

// shared instance for tests
const eventEmitter = new EventEmitter<Events>();

// properties
{
    // `emit` is the same as the `Events` type, except readonly
    expectType<{
        readonly foo: (a: number, b: boolean) => void;
        readonly bar: () => void;
    }>(eventEmitter.emit);
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
        },
    });

    // subscribe with partial handlers object, handler returns a Promise.
    eventEmitter.on({
        foo: (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
            return Promise.resolve();
        },
    });

    // subscribe with partial handlers object, handler returns an invalid type.
    expectError(
        eventEmitter.on({
            foo: (a, b) => {
                expectType<number>(a);
                expectType<boolean>(b);
                return 42;
            },
        })
    );

    // subscribe with partial handlers object, partial options
    eventEmitter.on(
        {
            foo: (a, b) => {
                expectType<number>(a);
                expectType<boolean>(b);
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
    });

    // subscribe with event name, handler returns a Promise
    eventEmitter.on("foo", (a, b) => {
        expectType<number>(a);
        expectType<boolean>(b);
        return Promise.resolve();
    });

    expectError(
        // subscribe with event name, handler returns an invalid type
        eventEmitter.on("foo", (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
            return 42;
        })
    );

    // subscribe with event name, partial options
    eventEmitter.on(
        "foo",
        (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
        },
        {
            once: true,
        }
    );

    // returns a SubscriptionCanceller
    expectType<SubscriptionCanceller>(eventEmitter.on("bar", () => undefined));
}
