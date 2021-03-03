import { EventPublisher } from "./EventPublisher";

// Sample Events interface for testing
interface Events {
    onFoo(a: number, b: boolean): boolean;
    onBar(): string;
}

describe("General publishing", () => {
    test("Can publish without any subscribers", () => {
        const publisher = new EventPublisher<Events>();

        expect(() => {
            publisher.publish.onFoo(10, true);
        }).not.toThrow();
    });

    test("Publishes to all subscribers (and passes parameters)", () => {
        const publisher = new EventPublisher<Events>();

        const foo1 = jest.fn();
        const foo2 = jest.fn();
        const bar1 = jest.fn();
        const bar2 = jest.fn();

        publisher.subscribe({
            onFoo: foo1,
        });

        publisher.subscribe({
            onFoo: foo2,
            onBar: bar1,
        });

        publisher.subscribe({
            // explicit undefied event handler should not make anything blow up
            onFoo: undefined,
            onBar: bar2,
        });

        // None of the handlers are called yet
        expect(foo1).not.toHaveBeenCalled();
        expect(foo2).not.toHaveBeenCalled();
        expect(bar1).not.toHaveBeenCalled();
        expect(bar2).not.toHaveBeenCalled();

        // Publish "onFoo"
        expect(publisher.publish.onFoo(42, true)).toBe(undefined);

        // "foo" handlers are called appropriately
        expect(foo1).toHaveBeenCalledTimes(1);
        expect(foo1).toHaveBeenLastCalledWith(42, true);
        expect(foo2).toHaveBeenCalledTimes(1);
        expect(foo2).toHaveBeenLastCalledWith(42, true);

        // "bar" handlers not called by publishing "onFoo"
        expect(bar1).not.toHaveBeenCalled();
        expect(bar2).not.toHaveBeenCalled();

        // Publish "onBar"
        publisher.publish.onBar();

        // "bar" handlers are called appropriately
        expect(bar1).toHaveBeenCalledTimes(1);
        expect(bar1).toHaveBeenLastCalledWith();
        expect(bar2).toHaveBeenCalledTimes(1);
        expect(bar2).toHaveBeenLastCalledWith();

        // "foo" handlers not called by publishing "onBar"
        expect(foo1).toHaveBeenCalledTimes(1);
        expect(foo2).toHaveBeenCalledTimes(1);

        // Publish "onFoo" again with different params
        publisher.publish.onFoo(1337, false);

        // "foo" handlers are called appropriately
        expect(foo1).toHaveBeenCalledTimes(2);
        expect(foo1).toHaveBeenLastCalledWith(1337, false);
        expect(foo2).toHaveBeenCalledTimes(2);
        expect(foo2).toHaveBeenLastCalledWith(1337, false);
    });
});

describe("Cancel subscription", () => {
    test("Cancels handlers for ALL events included in the subscription", () => {
        const publisher = new EventPublisher<Events>();

        const fooForever = jest.fn();
        const barForever = jest.fn();
        const fooUnsubscribed = jest.fn();
        const barUnsubscribed = jest.fn();

        // will NOT unsubscribe
        publisher.subscribe({
            onFoo: fooForever,
        });

        // WILL unsubscribe
        const cancelSubscription = publisher.subscribe({
            onFoo: fooUnsubscribed,
            onBar: barUnsubscribed,
        });

        // will NOT unsubscribe
        publisher.subscribe({
            onBar: barForever,
        });

        // Publish both events once before cancelling subscription
        publisher.publish.onFoo(42, true);
        publisher.publish.onBar();

        // All handlers called
        expect(fooForever).toHaveBeenCalledTimes(1);
        expect(barForever).toHaveBeenCalledTimes(1);
        expect(fooUnsubscribed).toHaveBeenCalledTimes(1);
        expect(barUnsubscribed).toHaveBeenCalledTimes(1);

        // Cancel subscription, then publish both events again
        cancelSubscription();
        publisher.publish.onFoo(1337, false);
        publisher.publish.onBar();

        // unsubscribed handlers NOT called again
        expect(fooUnsubscribed).toHaveBeenCalledTimes(1);
        expect(barUnsubscribed).toHaveBeenCalledTimes(1);
        // still-subscribed handlers called again
        expect(fooForever).toHaveBeenCalledTimes(2);
        expect(barForever).toHaveBeenCalledTimes(2);
    });

    test("Cancelling multiple times is ignored", () => {
        const publisher = new EventPublisher<Events>();
        const cancelSubscription = publisher.subscribe({
            onBar: () => "test",
        });

        // Cancel normally
        cancelSubscription();

        // Second cancel should not cause any errors
        expect(() => {
            cancelSubscription();
        }).not.toThrow();
    });
});

describe("Event option: `onSubscribe`", () => {
    test("Handlers can be called immediately upon subscription via onSubscribe (individual subscription can opt out)", () => {
        const publisher = new EventPublisher<Events>({
            onFoo: {
                onSubscribe: (handler) => {
                    handler(42, true);
                },
            },
            onBar: {
                onSubscribe: (handler) => {
                    handler();
                },
            },
        });

        const fooOnSubscribe = jest.fn();
        const barOnSubscribe = jest.fn();
        const fooSkipOnSubscribe = jest.fn();
        const barSkipOnSubscribe = jest.fn();

        publisher.subscribe({
            onFoo: fooOnSubscribe,
            onBar: barOnSubscribe,
        });

        publisher.subscribe(
            {
                onFoo: fooSkipOnSubscribe,
                onBar: barSkipOnSubscribe,
            },
            {
                skipOnSubscribe: true,
            }
        );

        // Handlers called immediately without an explicit publish
        expect(fooOnSubscribe).toHaveBeenCalledTimes(1);
        expect(fooOnSubscribe).toHaveBeenLastCalledWith(42, true);
        expect(barOnSubscribe).toHaveBeenCalledTimes(1);
        expect(barOnSubscribe).toHaveBeenLastCalledWith();

        // Handlers NOT called for subscription with `skipOnSubscribe: true`
        expect(fooSkipOnSubscribe).not.toHaveBeenCalled();
        expect(barSkipOnSubscribe).not.toHaveBeenCalled();

        // Publish both events
        publisher.publish.onFoo(1337, false);
        publisher.publish.onBar();

        // All handlers called by explicit publish
        expect(fooOnSubscribe).toHaveBeenCalledTimes(2);
        expect(fooOnSubscribe).toHaveBeenLastCalledWith(1337, false);
        expect(barOnSubscribe).toHaveBeenCalledTimes(2);
        expect(barOnSubscribe).toHaveBeenLastCalledWith();
        expect(fooSkipOnSubscribe).toHaveBeenCalledTimes(1);
        expect(fooSkipOnSubscribe).toHaveBeenLastCalledWith(1337, false);
        expect(barSkipOnSubscribe).toHaveBeenCalledTimes(1);
        expect(barSkipOnSubscribe).toHaveBeenLastCalledWith();
    });
});

describe("Event option: `once`", () => {
    test("Automatically unsubscribe after handling one publish", () => {
        const publisher = new EventPublisher<Events>();

        const fooOnce = jest.fn();
        const barOnce = jest.fn();
        const fooForever = jest.fn();
        const barForever = jest.fn();

        // will NOT unsubscribe
        publisher.subscribe({
            onFoo: fooForever,
        });

        // WILL auto-unsubscribe after first publish to each event
        // (each event handler independently unsubscribed)
        publisher.subscribe(
            {
                onFoo: fooOnce,
                onBar: barOnce,
            },
            {
                once: true,
            }
        );

        // Will NOT unsubscribe
        publisher.subscribe({
            onBar: barForever,
        });

        // Publish both events
        publisher.publish.onFoo(42, true);
        publisher.publish.onBar();

        // All handlers called
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        expect(fooForever).toHaveBeenCalledTimes(1);
        expect(barForever).toHaveBeenCalledTimes(1);

        // Publish both events again
        publisher.publish.onFoo(1337, false);
        publisher.publish.onBar();

        // "once"" handlers NOT called again
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        // still-subscribed handlers called again
        expect(fooForever).toHaveBeenCalledTimes(2);
        expect(barForever).toHaveBeenCalledTimes(2);
    });

    test("Automatically unsubscribe after handling initial onSubscribe auto-publish", () => {
        const publisher = new EventPublisher<Events>({
            onFoo: {
                onSubscribe: (handler) => {
                    handler(42, true);
                },
            },
            onBar: {
                onSubscribe: (handler) => {
                    handler();
                },
            },
        });

        const fooOnce = jest.fn();
        const barOnce = jest.fn();
        const fooForever = jest.fn();
        const barForever = jest.fn();

        // will NOT unsubscribe
        publisher.subscribe({
            onFoo: fooForever,
        });

        // WILL auto-unsubscribe after auto publish on subscribe to each event
        // (each event handler independently unsubscribed)
        publisher.subscribe(
            {
                onFoo: fooOnce,
                onBar: barOnce,
            },
            {
                once: true,
            }
        );

        // will NOT unsubscribe
        publisher.subscribe({
            onBar: barForever,
        });

        // All handlers called on publish
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        expect(fooForever).toHaveBeenCalledTimes(1);
        expect(barForever).toHaveBeenCalledTimes(1);

        // Publish both events again
        publisher.publish.onFoo(1337, false);
        publisher.publish.onBar();

        // "once"" handlers NOT called again
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        // still-subscribed handlers called again
        expect(fooForever).toHaveBeenCalledTimes(2);
        expect(barForever).toHaveBeenCalledTimes(2);
    });

    test("Automatically unsubscribee after skipping initial onSubscribe auto-publish and handling one event publish", () => {
        const publisher = new EventPublisher<Events>({
            onFoo: {
                onSubscribe: (handler) => {
                    handler(42, true);
                },
            },
            onBar: {
                onSubscribe: (handler) => {
                    handler();
                },
            },
        });

        const fooForever = jest.fn();
        const barForever = jest.fn();
        const fooOnce = jest.fn();
        const barOnce = jest.fn();

        // will NOT unsubscribe
        publisher.subscribe({
            onFoo: fooForever,
        });

        // WILL auto-unsubscribe after first publish to each event
        // (each event handler independently unsubscribed)
        publisher.subscribe(
            {
                onFoo: fooOnce,
                onBar: barOnce,
            },
            {
                once: true,
                skipOnSubscribe: true,
            }
        );

        // will NOT unsubscribe
        publisher.subscribe({
            onBar: barForever,
        });

        // These handlers skipped onSubscribe
        expect(fooOnce).toHaveBeenCalledTimes(0);
        expect(barOnce).toHaveBeenCalledTimes(0);
        // These handlers called on subscribe
        expect(fooForever).toHaveBeenCalledTimes(1);
        expect(barForever).toHaveBeenCalledTimes(1);

        // Publish both events
        publisher.publish.onFoo(42, true);
        publisher.publish.onBar();

        // All handlers called
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        expect(fooForever).toHaveBeenCalledTimes(2);
        expect(barForever).toHaveBeenCalledTimes(2);

        // Publish both events again
        publisher.publish.onFoo(1337, false);
        publisher.publish.onBar();

        // "once"" handlers NOT called again
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        // still-subscribed handlers called again
        expect(barForever).toHaveBeenCalledTimes(3);
        expect(fooForever).toHaveBeenCalledTimes(3);
    });

    test("NOT unsubscribed onPublish if onPublish handler does NOT call the handler", () => {
        const onFooSubscribe = jest.fn();
        const onBarSubscribe = jest.fn();

        const publisher = new EventPublisher<Events>({
            onFoo: {
                // Doeas NOT call handler!
                onSubscribe: onFooSubscribe,
            },
            onBar: {
                // Doeas NOT call handler!
                onSubscribe: onBarSubscribe,
            },
        });

        const fooForever = jest.fn();
        const barForever = jest.fn();
        const fooOnce = jest.fn();
        const barOnce = jest.fn();

        // will NOT unsubscribe
        publisher.subscribe({
            onFoo: fooForever,
        });

        // WILL auto-unsubscribe after first publish to each event
        // (each event handler independently unsubscribed)
        publisher.subscribe(
            {
                onFoo: fooOnce,
                onBar: barOnce,
            },
            {
                once: true,
            }
        );

        // will NOT unsubscribe
        publisher.subscribe({
            onBar: barForever,
        });

        // onSubscribe handlers were called for each subscribe...
        expect(onFooSubscribe).toHaveBeenCalledTimes(2);
        expect(onBarSubscribe).toHaveBeenCalledTimes(2);

        // ...but onSubscribe handlers did not actually call the event handlers!
        expect(fooOnce).toHaveBeenCalledTimes(0);
        expect(barOnce).toHaveBeenCalledTimes(0);
        expect(fooForever).toHaveBeenCalledTimes(0);
        expect(barForever).toHaveBeenCalledTimes(0);

        // Publish both events
        publisher.publish.onFoo(42, true);
        publisher.publish.onBar();

        // All handlers called
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        expect(fooForever).toHaveBeenCalledTimes(1);
        expect(barForever).toHaveBeenCalledTimes(1);

        // Publish both events again
        publisher.publish.onFoo(1337, false);
        publisher.publish.onBar();

        // "once"" handlers NOT called again
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        // still-subscribed handlers called again
        expect(barForever).toHaveBeenCalledTimes(2);
        expect(fooForever).toHaveBeenCalledTimes(2);
    });
});

describe("Event handler return value", () => {
    test("Return value is ignored and not returned when publishing", () => {
        const publisher = new EventPublisher<Events>();

        const foo1 = jest.fn().mockReturnValue(true);
        // Second handler will return false, but this does nothing special
        // (does not abort publishing to remaining handlers)
        const foo2 = jest.fn().mockReturnValue(false);
        const foo3 = jest.fn().mockReturnValue(true);

        publisher.subscribe({
            onFoo: foo1,
        });

        publisher.subscribe({
            onFoo: foo2,
        });

        publisher.subscribe({
            onFoo: foo3,
        });

        // Publish returns undefinend
        expect(publisher.publish.onFoo(42, true)).toBe(undefined);

        // All handlers called, even though one returned false
        expect(foo1).toBeCalledTimes(1);
        expect(foo2).toBeCalledTimes(1);
        expect(foo3).toBeCalledTimes(1);
    });

    test("Return value IS returned in onSubscribe handler", () => {
        const publisher = new EventPublisher<Events>({
            onBar: {
                onSubscribe: (handler) => {
                    // Handler returns expected value
                    expect(handler()).toBe("hello!");
                },
            },
        });

        // Handler returns a value
        const bar = jest.fn().mockReturnValue("hello!");

        publisher.subscribe({
            onBar: bar,
        });

        // Sanity check to confirm the `onSubscribe` handler was called
        expect(bar).toBeCalledTimes(1);
    });
});

describe("Shorthand subscription to a single event", () => {
    // All the details and edge cases can be assumed to work properly if
    // the basics are confirmed, because at subscription time, a shorthand
    // subscription is converted into a full subscription event handlers
    // object with only the one event's handler specified.
    test("General sanity check", () => {
        const publisher = new EventPublisher<Events>({
            onFoo: {
                onSubscribe: (handler) => {
                    handler(42, true);
                },
            },
        });

        const fooAlways = jest.fn();
        const fooOnce = jest.fn();

        // One simple example without any options
        publisher.subscribe("onFoo", fooAlways);

        // One example with a subscription option
        // (Don't need to test all options and edge cases; just confirm that options are applied)
        publisher.subscribe("onFoo", fooOnce, {
            once: true,
        });

        // Both handlers called by onSubscribe
        expect(fooAlways).toHaveBeenCalledTimes(1);
        expect(fooAlways).toHaveBeenLastCalledWith(42, true);
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(fooOnce).toHaveBeenLastCalledWith(42, true);

        publisher.publish.onFoo(1337, false);

        // Simple handler is called again
        expect(fooAlways).toHaveBeenCalledTimes(2);
        expect(fooAlways).toHaveBeenLastCalledWith(1337, false);
        // The one-time handler is NOT called again
        expect(fooOnce).toHaveBeenCalledTimes(1);
    });
});
