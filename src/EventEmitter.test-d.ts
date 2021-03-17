// tslint:disable:no-unused-expression
// NOTE: import from root/index to test against publicly exported types
import { EventEmitter, SubscriptionCanceller, EventSource, once } from ".";
import { expectType, expectError } from "tsd";

const baz = Symbol("baz");
const bad = Symbol("bad");

// Sample Events interface for testing
interface Events {
    foo(a: number, b: boolean): void;
    bar(a: string): void;
    [baz](a: boolean): void;
}

// shared instance for tests
const eventEmitter = new EventEmitter<Events>();

// properties
{
    // `emit` is the same as the `Events` type, except readonly
    expectType<{
        readonly foo: (a: number, b: boolean) => void;
        readonly bar: (a: string) => void;
        readonly [baz]: (a: boolean) => void;
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
        eventEmitter.subscribe({
            bad: () => {
                // empty
            },
        })
    );

    // subscribe with a valid event name
    eventEmitter.subscribe({
        foo: (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
        },
    });

    // subscribe with multiple event names
    eventEmitter.subscribe({
        foo: (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
        },
        bar: (a) => {
            expectType<string>(a);
        },
    });

    // subscribe using `once()`
    eventEmitter.subscribe({
        foo: once((a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
        }),
    });

    // handler returns a Promise.
    eventEmitter.subscribe({
        foo: (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
            return Promise.resolve();
        },
    });

    // handler returns an invalid type.
    expectError(
        eventEmitter.subscribe({
            foo: (a, b) => {
                expectType<number>(a);
                expectType<boolean>(b);
                return 42;
            },
        })
    );

    // subscribe to a valid unique symbol event name
    eventEmitter.subscribe({
        [baz]: (a) => {
            expectType<boolean>(a);
        },
    });

    // subscribe to an invalid unique symbol event name
    expectError(
        eventEmitter.subscribe({
            [bad]: () => undefined,
        })
    );

    // returns a SubscriptionCanceller
    expectType<SubscriptionCanceller>(eventEmitter.subscribe({}));
}

// on()
{
    // subscribe with invalid event name
    expectError(
        eventEmitter.on("broken", () => {
            // empty
        })
    );

    // subscribe with valid event name
    eventEmitter.on("foo", (a, b) => {
        expectType<number>(a);
        expectType<boolean>(b);
    });

    // handler returns a Promise
    eventEmitter.on("foo", (a, b) => {
        expectType<number>(a);
        expectType<boolean>(b);
        return Promise.resolve();
    });

    // handler returns an invalid type
    expectError(
        eventEmitter.on("foo", (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
            return 42;
        })
    );

    // subscribe to a valid unique symbol event name
    eventEmitter.on(baz, (a) => {
        expectType<boolean>(a);
    });

    // subscribe to an invalid unique symbol event name
    expectError(eventEmitter.on(bad, () => undefined));

    // returns a SubscriptionCanceller
    expectType<SubscriptionCanceller>(eventEmitter.on("bar", () => undefined));
}

// once()
{
    // subscribe with invalid event name
    expectError(
        eventEmitter.once("broken", () => {
            // empty
        })
    );

    // subscribe with valid event name
    eventEmitter.once("foo", (a, b) => {
        expectType<number>(a);
        expectType<boolean>(b);
    });

    // handler returns a Promise
    eventEmitter.once("foo", (a, b) => {
        expectType<number>(a);
        expectType<boolean>(b);
        return Promise.resolve();
    });

    // handler returns an invalid type
    expectError(
        eventEmitter.once("foo", (a, b) => {
            expectType<number>(a);
            expectType<boolean>(b);
            return 42;
        })
    );

    // subscribe to a valid unique symbol event name
    eventEmitter.once(baz, (a) => {
        expectType<boolean>(a);
    });

    // subscribe to an invalid unique symbol event name
    expectError(eventEmitter.once(bad, () => undefined));

    // returns a SubscriptionCanceller
    expectType<SubscriptionCanceller>(
        eventEmitter.once("bar", () => undefined)
    );
}

// onceAsPromise()
{
    // subscribe with invalid event name
    expectError(eventEmitter.onceAsPromise("broken"));

    // subscribe with valid event name
    eventEmitter.onceAsPromise("foo").then(([a, b]) => {
        expectType<number>(a);
        expectType<boolean>(b);
    });

    // subscribe to a valid unique symbol event name
    eventEmitter.onceAsPromise(baz).then(([a]) => {
        expectType<boolean>(a);
    });

    // subscribe to an invalid unique symbol event name
    expectError(eventEmitter.onceAsPromise(bad));

    // returns a Promise
    expectType<Promise<[number, boolean]>>(eventEmitter.onceAsPromise("foo"));
}
