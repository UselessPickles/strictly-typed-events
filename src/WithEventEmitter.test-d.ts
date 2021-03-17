// tslint:disable:no-unused-expression
// NOTE: import from root/index to test against publicly exported types
import { EventEmitter, WithEventEmitter } from ".";
import { expectType } from "tsd";

// Sample Events interface for testing
interface Events {
    foo(a: number, b: boolean): void;
}

// Sample class that extends WithEventEmitter for testing
class Widget extends WithEventEmitter<Events> {
    public constructor() {
        super();
        // Verify that a special "emit" property is inherited that is the
        // same type as EventEmitter's "emit" property.
        expectType<EventEmitter<Events>["emit"]>(this.emit);
    }
}

const widget = new Widget();

// Verify that the signature of the inherited methods method are the same
// as the signature of the same methods on EventEmitter.
expectType<EventEmitter<Events>["on"]>(widget.on);
expectType<EventEmitter<Events>["once"]>(widget.once);
expectType<EventEmitter<Events>["onceAsPromise"]>(widget.onceAsPromise);
expectType<EventEmitter<Events>["subscribe"]>(widget.subscribe);
