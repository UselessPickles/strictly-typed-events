// tslint:disable:no-unused-expression
import { EventPublisher } from "./EventPublisher";
import { WithEventPublisher } from "./WithEventPublisher";
import { expectType } from "tsd";

// Sample Events interface for testing
interface Events {
    onFoo(a: number, b: boolean): boolean;
}

// Sample class that extends WithEventPublisher for testing
class Widget extends WithEventPublisher<Events> {
    public constructor() {
        super();
        // Verify that a special "publish" property is inherited that is the
        // same type as EventPublisher's "publish" property.
        expectType<EventPublisher<Events>["publish"]>(this.publish);
    }
}

// shared instance for tests
const widget = new Widget();

// Verify that the signature of the inherited "subscribe" and "unsubscribe"
// methods are the same as the signature of the same methods on EventPublisher.
expectType<EventPublisher<Events>["subscribe"]>(widget.subscribe);
expectType<EventPublisher<Events>["unsubscribe"]>(widget.unsubscribe);
