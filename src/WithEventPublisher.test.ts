import { WithEventPublisher } from "./WithEventPublisher";

// Sample Events interface for testing
interface Events {
    onFoo(a: number, b: boolean): boolean;
}

// Sample class that extends WithEventPublisher for testing
class Widget extends WithEventPublisher<Events> {
    public constructor() {
        // Helps validate that EventPublisher constructor params are passed through
        super({
            onFoo: {
                onSubscribe: (handler) => {
                    handler(42, true);
                },
            },
        });
    }

    // Helps validate that the class inherits access topublishing events
    public triggerFoo(a: number, b: boolean): void {
        this.publish.onFoo(a, b);
    }
}

// Exhaustive testing is not necessary because WithEventPublisher is a simple
// pass-through to an EventPublisher instance. We only need to cover the basics:
// - Can subscribe via methiod inherited from WithEventPublisher.
// - Subscription options are applied.
// - Can unsubscribe via method inherited from WithEventPublisher.
// - Can publish events via `publish` property inherited from WithEventPublisher.
test("General sanity check", () => {
    const widget = new Widget();

    const fooAlways = jest.fn();
    const fooUnsubscribed = jest.fn();
    const fooOnce = jest.fn();

    widget.subscribe({
        onFoo: fooAlways,
    });

    // Will be unsubscribed.
    // Also testing short-hand subscription to a single event.
    const subscriptionId = widget.subscribe("onFoo", fooUnsubscribed);

    // One-time only subscription
    // (validating that subscription options are passed through)
    widget.subscribe(
        {
            onFoo: fooOnce,
        },
        {
            once: true,
        }
    );

    // All handlers called initially by onSubscribe
    expect(fooAlways).toHaveBeenCalledTimes(1);
    expect(fooAlways).toHaveBeenLastCalledWith(42, true);
    expect(fooUnsubscribed).toHaveBeenCalledTimes(1);
    expect(fooUnsubscribed).toHaveBeenLastCalledWith(42, true);
    expect(fooOnce).toHaveBeenCalledTimes(1);
    expect(fooOnce).toHaveBeenLastCalledWith(42, true);

    // trigger event
    widget.triggerFoo(1337, false);

    // Still-subscribed handlers called
    expect(fooAlways).toHaveBeenCalledTimes(2);
    expect(fooAlways).toHaveBeenLastCalledWith(1337, false);
    expect(fooUnsubscribed).toHaveBeenCalledTimes(2);
    expect(fooUnsubscribed).toHaveBeenLastCalledWith(1337, false);
    // One-time subscription not called again
    expect(fooOnce).toHaveBeenCalledTimes(1);

    widget.unsubscribe(subscriptionId);
    widget.triggerFoo(-1, true);

    // Still-subscribed handler called
    expect(fooAlways).toHaveBeenCalledTimes(3);
    expect(fooAlways).toHaveBeenLastCalledWith(-1, true);
    // Unsubscribed handler not called again
    expect(fooUnsubscribed).toHaveBeenCalledTimes(2);
    // One-time subscription not called again
    expect(fooOnce).toHaveBeenCalledTimes(1);
});
