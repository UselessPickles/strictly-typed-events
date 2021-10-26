import { expectType } from "tsd";
// NOTE: import from root/index to test against publicly exported types
import {
    EventHandlersType,
    WithEventEmitter,
    EventSource,
    EventsType,
    EventSourceType,
} from ".";

// Sample Events interface for testing
interface Events {
    foo(a: number, b: boolean): void;
}

// Sample class that extends WithEventEmitter for testing
class Widget extends WithEventEmitter<Events> {
    public constructor() {
        super();
    }
}

// EventsType
{
    expectType<Events>({} as EventsType<Widget>);
}

// EventHandlersType
{
    expectType<{
        foo(a: number, b: boolean): void | Promise<void>;
    }>({} as EventHandlersType<Widget>);
}

// EventSourceType
{
    expectType<EventSource<Events>>({} as EventSourceType<Widget>);
}
