import { EventEmitter } from "./EventEmitter";
import { once } from "./once";
import flushPromises from "flush-promises";

const baz = Symbol("baz");

// Sample Events interface for testing
interface Events {
    foo(a: number, b: boolean): void;
    bar(): void;
    [baz](): void;
}

describe("toEventSource()", () => {
    test("Returns a new EventSource", () => {
        const emitter = new EventEmitter<Events>();

        // Does NOT simply return the emitter typecast to an EventSource
        expect(emitter.toEventSource()).not.toBe(emitter);
    });

    // NOTE: Only doing a basic sanity test of one method of subscribing to an event.
    //       Assuming that the simplistic design of the code and type safety guarantees
    //       that all subscription methods/hehaviors will equally be passed through properly.
    test("Passes through subscriptions to the original EventEmitter", () => {
        const emitter = new EventEmitter<Events>();
        const eventSource = emitter.toEventSource();

        // Subscribe to the resulting EventSource
        const foo = jest.fn();
        eventSource.on("foo", foo);

        // Emit an event via the original EventEmitter
        emitter.emit.foo(42, true);

        // event handler was called
        expect(foo).toHaveBeenCalledTimes(1);
        expect(foo).toHaveBeenLastCalledWith(42, true);
    });
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
        const baz1 = jest.fn();

        emitter.subscribe({
            foo: foo1,
        });

        emitter.subscribe({
            foo: foo2,
            bar: bar1,
        });

        emitter.subscribe({
            // explicit undefied event handler should not make anything blow up
            foo: undefined,
            bar: bar2,
            // test subscribing to a unique symbol event name
            [baz]: baz1,
        });

        // None of the handlers are called yet
        expect(foo1).not.toHaveBeenCalled();
        expect(foo2).not.toHaveBeenCalled();
        expect(bar1).not.toHaveBeenCalled();
        expect(bar2).not.toHaveBeenCalled();
        expect(baz1).not.toHaveBeenCalled();

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

        // emit "baz" event (testing that unique symbol subscription works)
        emitter.emit[baz]();

        expect(baz1).toHaveBeenCalledTimes(1);
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
        emitter.subscribe({
            foo: fooForever,
        });

        // WILL cancel
        const cancel = emitter.subscribe({
            foo: fooUnsubscribed,
            bar: barUnsubscribed,
        });

        // will NOT unsubscribe
        emitter.subscribe({
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
        const cancel = emitter.subscribe({
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

describe("Event option: `once()`", () => {
    test("Automatically unsubscribe after handling one emit", () => {
        const emitter = new EventEmitter<Events>();

        const fooOnce = jest.fn();
        const barOnce = jest.fn();
        const fooForever = jest.fn();
        const barForever = jest.fn();

        // will NOT unsubscribe
        emitter.subscribe({
            foo: fooForever,
        });

        // WILL auto-unsubscribe after first emit to each event
        // (each event handler independently unsubscribed)
        emitter.subscribe({
            foo: once(fooOnce),
            bar: once(barOnce),
        });

        // Will NOT unsubscribe
        emitter.subscribe({
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
        emitter.once("foo", fooOnce);

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

    test("can subscribe to unique symbol event names", () => {
        const emitter = new EventEmitter<Events>();

        const bazHandler = jest.fn();

        emitter.on(baz, bazHandler);

        emitter.emit[baz]();

        expect(bazHandler).toHaveBeenCalledTimes(1);
    });
});

test("onceAsPromise()", async () => {
    const emitter = new EventEmitter<Events>();
    const fooPromiseHandler = jest.fn();

    emitter.onceAsPromise("foo").then(fooPromiseHandler);
    await flushPromises();

    expect(fooPromiseHandler).not.toHaveBeenCalled();

    emitter.emit.foo(42, true);
    await flushPromises();

    expect(fooPromiseHandler).toHaveBeenCalledTimes(1);
    expect(fooPromiseHandler.mock.calls[0][0][0]).toBe(42);
    expect(fooPromiseHandler.mock.calls[0][0][1]).toBe(true);
});

test("Handlers are called in order", () => {
    const output: number[] = [];

    const emitter = new EventEmitter<Events>();

    emitter.on("bar", () => {
        output.push(1);
    });

    emitter.on("bar", () => {
        output.push(2);
    });

    emitter.on("bar", () => {
        output.push(3);
    });

    emitter.on("bar", () => {
        output.push(4);
    });

    emitter.emit.bar();

    expect(output).toEqual([1, 2, 3, 4]);
});

test("Handlers that are added during an emit are not called during the same emit", () => {
    let output: number[] = [];
    const emitter = new EventEmitter<Events>();

    emitter.on("bar", () => {
        output.push(1);
    });

    emitter.on("bar", () => {
        output.push(2);

        emitter.on("bar", () => {
            output.push(3);
        });
    });

    emitter.emit.bar();

    expect(output).toEqual([1, 2]);

    // reset the output array and emit the event again, confirming that all 3
    // handlers are called now
    output = [];
    emitter.emit.bar();

    expect(output).toEqual([1, 2, 3]);
});

test("Handlers that are removed during an emit are not called during that emit (unless they were already called before being cancelled)", () => {
    let output: number[] = [];
    const emitter = new EventEmitter<Events>();

    const cancel1 = emitter.on("bar", () => {
        output.push(1);
    });

    emitter.on("bar", () => {
        output.push(2);
        cancel1();
        cancel3();
    });

    // This subscription will be cancelled before it has a chance to be called
    const cancel3 = emitter.on("bar", () => {
        output.push(3);
    });

    emitter.emit.bar();

    expect(output).toEqual([1, 2]);

    // reset the output array and emit the event again, both the 1st and 3rd
    // subscriptions were cancelled.
    output = [];
    emitter.emit.bar();

    expect(output).toEqual([2]);
});
