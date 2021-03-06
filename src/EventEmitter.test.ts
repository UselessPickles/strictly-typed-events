import { EventEmitter } from "./EventEmitter";

// Sample Events interface for testing
interface Events {
    foo(a: number, b: boolean): void;
    bar(): void;
}

test("asEventSource()", () => {
    const emitter = new EventEmitter<Events>();

    expect(emitter.asEventSource()).toBe(emitter);
});

describe("General emitting", () => {
    test("Can emit without any subscribers", () => {
        const emitter = new EventEmitter<Events>();

        expect(() => {
            emitter.emit.foo(10, true);
        }).not.toThrow();
    });

    test("Emits to all subscribers (and passes parameters)", () => {
        const emitter = new EventEmitter<Events>();

        const foo1 = jest.fn();
        const foo2 = jest.fn();
        const bar1 = jest.fn();
        const bar2 = jest.fn();

        emitter.on({
            foo: foo1,
        });

        emitter.on({
            foo: foo2,
            bar: bar1,
        });

        emitter.on({
            // explicit undefied event handler should not make anything blow up
            foo: undefined,
            bar: bar2,
        });

        // None of the handlers are called yet
        expect(foo1).not.toHaveBeenCalled();
        expect(foo2).not.toHaveBeenCalled();
        expect(bar1).not.toHaveBeenCalled();
        expect(bar2).not.toHaveBeenCalled();

        // Emit "foo"
        expect(emitter.emit.foo(42, true)).toBe(undefined);

        // "foo" handlers are called appropriately
        expect(foo1).toHaveBeenCalledTimes(1);
        expect(foo1).toHaveBeenLastCalledWith(42, true);
        expect(foo2).toHaveBeenCalledTimes(1);
        expect(foo2).toHaveBeenLastCalledWith(42, true);

        // "bar" handlers not called by emitting "foo"
        expect(bar1).not.toHaveBeenCalled();
        expect(bar2).not.toHaveBeenCalled();

        // Emit "bar"
        emitter.emit.bar();

        // "bar" handlers are called appropriately
        expect(bar1).toHaveBeenCalledTimes(1);
        expect(bar1).toHaveBeenLastCalledWith();
        expect(bar2).toHaveBeenCalledTimes(1);
        expect(bar2).toHaveBeenLastCalledWith();

        // "foo" handlers not called by emitting "bar"
        expect(foo1).toHaveBeenCalledTimes(1);
        expect(foo2).toHaveBeenCalledTimes(1);

        // Emit "foo" again with different params
        emitter.emit.foo(1337, false);

        // "foo" handlers are called appropriately
        expect(foo1).toHaveBeenCalledTimes(2);
        expect(foo1).toHaveBeenLastCalledWith(1337, false);
        expect(foo2).toHaveBeenCalledTimes(2);
        expect(foo2).toHaveBeenLastCalledWith(1337, false);
    });
});

describe("Cancel subscription", () => {
    test("Cancels handlers for ALL events included in the subscription", () => {
        const emitter = new EventEmitter<Events>();

        const fooForever = jest.fn();
        const barForever = jest.fn();
        const fooUnsubscribed = jest.fn();
        const barUnsubscribed = jest.fn();

        // will NOT unsubscribe
        emitter.on({
            foo: fooForever,
        });

        // WILL cancel
        const cancel = emitter.on({
            foo: fooUnsubscribed,
            bar: barUnsubscribed,
        });

        // will NOT unsubscribe
        emitter.on({
            bar: barForever,
        });

        // Emit both events once before cancelling subscription
        emitter.emit.foo(42, true);
        emitter.emit.bar();

        // All handlers called
        expect(fooForever).toHaveBeenCalledTimes(1);
        expect(barForever).toHaveBeenCalledTimes(1);
        expect(fooUnsubscribed).toHaveBeenCalledTimes(1);
        expect(barUnsubscribed).toHaveBeenCalledTimes(1);

        // Cancel subscription, then emit both events again
        cancel();
        emitter.emit.foo(1337, false);
        emitter.emit.bar();

        // unsubscribed handlers NOT called again
        expect(fooUnsubscribed).toHaveBeenCalledTimes(1);
        expect(barUnsubscribed).toHaveBeenCalledTimes(1);
        // still-subscribed handlers called again
        expect(fooForever).toHaveBeenCalledTimes(2);
        expect(barForever).toHaveBeenCalledTimes(2);
    });

    test("Cancelling multiple times is ignored", () => {
        const emitter = new EventEmitter<Events>();
        const cancel = emitter.on({
            bar: () => undefined,
        });

        // Cancel normally
        cancel();

        // Second cancel should not cause any errors
        expect(() => {
            cancel();
        }).not.toThrow();
    });
});

describe("Event option: `once`", () => {
    test("Automatically unsubscribe after handling one emit", () => {
        const emitter = new EventEmitter<Events>();

        const fooOnce = jest.fn();
        const barOnce = jest.fn();
        const fooForever = jest.fn();
        const barForever = jest.fn();

        // will NOT unsubscribe
        emitter.on({
            foo: fooForever,
        });

        // WILL auto-unsubscribe after first emit to each event
        // (each event handler independently unsubscribed)
        emitter.on(
            {
                foo: fooOnce,
                bar: barOnce,
            },
            {
                once: true,
            }
        );

        // Will NOT unsubscribe
        emitter.on({
            bar: barForever,
        });

        // Emit both events
        emitter.emit.foo(42, true);
        emitter.emit.bar();

        // All handlers called
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        expect(fooForever).toHaveBeenCalledTimes(1);
        expect(barForever).toHaveBeenCalledTimes(1);

        // Emit both events again
        emitter.emit.foo(1337, false);
        emitter.emit.bar();

        // "once"" handlers NOT called again
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(barOnce).toHaveBeenCalledTimes(1);
        // still-subscribed handlers called again
        expect(fooForever).toHaveBeenCalledTimes(2);
        expect(barForever).toHaveBeenCalledTimes(2);
    });
});

describe("Shorthand subscription to a single event", () => {
    // All the details and edge cases can be assumed to work properly if
    // the basics are confirmed, because at subscription time, a shorthand
    // subscription is converted into a full subscription event handlers
    // object with only the one event's handler specified.
    test("General sanity check", () => {
        const emitter = new EventEmitter<Events>();

        const fooAlways = jest.fn();
        const fooOnce = jest.fn();

        // One simple example without any options
        emitter.on("foo", fooAlways);

        // One example with a subscription option
        // (Don't need to test all options and edge cases; just confirm that options are applied)
        emitter.on("foo", fooOnce, {
            once: true,
        });

        emitter.emit.foo(42, true);

        // Both handlers called on first emit
        expect(fooAlways).toHaveBeenCalledTimes(1);
        expect(fooAlways).toHaveBeenLastCalledWith(42, true);
        expect(fooOnce).toHaveBeenCalledTimes(1);
        expect(fooOnce).toHaveBeenLastCalledWith(42, true);

        emitter.emit.foo(1337, false);

        // Simple handler is called again
        expect(fooAlways).toHaveBeenCalledTimes(2);
        expect(fooAlways).toHaveBeenLastCalledWith(1337, false);
        // The one-time handler is NOT called again
        expect(fooOnce).toHaveBeenCalledTimes(1);
    });
});
