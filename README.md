[![npm version](https://img.shields.io/npm/v/strictly-typed-events.svg)](https://www.npmjs.com/package/strictly-typed-events)
[![Join the chat at https://gitter.im/ts-enum-util/Lobby](https://badges.gitter.im/UselessPickles/strictly-typed-events//Lobby.svg)](https://gitter.im/UselessPickles/strictly-typed-events)
[![Build Status](https://travis-ci.org/UselessPickles/strictly-typed-events.svg?branch=main)](https://travis-ci.org/UselessPickles/strictly-typed-events)
[![Coverage Status](https://coveralls.io/repos/github/UselessPickles/strictly-typed-events/badge.svg?branch=main)](https://coveralls.io/github/UselessPickles/strictly-typed-events?branch=main)

# strictly-typed-events

An Event emitting/subscription library designed for simplicity, convenience, and
type-safety in TypeScript projects.

# Contents

<!-- TOC depthFrom:1 -->

-   [strictly-typed-events](#strictly-typed-events)
-   [Contents](#contents)
-   [Installation](#installation)
-   [Why?](#why)
-   [Example Usage/Patterns](#example-usagepatterns)
    -   [Subscribing and Cancelling Subscriptions](#subscribing-and-cancelling-subscriptions)
    -   [Add Events via Inheritence](#add-events-via-inheritence)
    -   [Add Events via Composition](#add-events-via-composition)

<!-- /TOC -->

# Installation

Install via [npm](https://www.npmjs.com/package/strictly-typed-events):

```
npm i -s strictly-typed-events
```

# Why?

Despite the many event libraries already available on `npm`, I could not find
one that met my desires. My goal is to easily setup a class that emits
well-defined events, with type-safety while emitting and subscribing/handling,
using minimal boilerplate. It should also be simple and intuitive to emit the
events, subscribe to events, and cancel subscriptions to events.

Some design goals:

-   Simplicity of an "event" just being a call to a named handler function, with
    the "payload" being represented as one or more function parameters.
-   Define all events for a given class in terms of a single interface of event
    handler function signatures.
-   Support subscribing to multiple events with one call, which subsequently supports
    cancelling that entire subscription to multiple events with one call.
-   Easily support exposing only the means to subscribe to events, while keeping
    the means to emit events private.

# Example Usage/Patterns

Here's some basic usage examples of `strictly-typed-events` and suggested patterns
to get you started. See documentation in the source code (detailed TSDoc/JSDoc
style comments on all types/classes/methods/etc.) for full details.

## Subscribing and Cancelling Subscriptions

For the following examples, assume there is a variable `source` that implements
this library's `EventSource` interface (has the `on()`/`once()`/`subscribe()`
methods to subscribe to events).

Subscribe to one event at a time:

```ts
// Event name will be type-safe based on valid event names for the
// event source (IDE can auto-complete it!).
// Event handler parameter types will be inferred based on
// signature of event.
// Hold onto the "cancel" function returned when subscribing.
const cancel = source.on("nameChanged", (newname, oldName) => {
    // do stuff
});

// Simply call the cancel function to cancel the subscription
// to the event.
cancel();
```

Subscribe to one event with a one-time-only handler:

```ts
// This handler will self-cancel its own subscription when it is called.
// You can still store the returned cancel function and call it in case you
// need to cancel the subscription before the first time it is called.
source.once("nameChanged", (newname, oldName) => {
    // do stuff
});
```

Or subscribe to multiple events at once:

```ts
// Hold onto the "cancel" function returned when subscribing.
const cancel = source.subscribe({
    // Provide handlers for any number of events in this object.
    // All type-safe, of course.
    nameChanged: (newname, oldName) => {
        // do stuff
    },
    // Wrap the handler in the `once()` function to make it a
    // one-time-only handler
    anotherEvent: once((whatever) => {
        // do stuff
    }),
});

// Simply call the cancel function to cancel the subscription
// to ALL events that were originally included in the subscription.
cancel();
```

## Add Events via Inheritence

Here's the simplest, lowest-effort way to add events to a class.
This works well for simple situations where your class is not already
extending another class, and you want the `on()` subscription
method to be directly on your class.

```ts
import { WithEventEmitter } from "strictly-typed-events";

// Simply extend `WithEventEmitter<>`, and define your events
// in the type parameter.
// Your class will now be an implementation of `EventSource`,
class Foo extends WithEventEmitter<{
    /**
     * You can document your event signatures, and IDEs
     * will be able to show this documentation in various
     * contexts where you emit this event or subscribe to
     * this event.
     * @param newName - The new name.
     * @param oldName - The old name.
     */
    nameChanged(newName: string, oldName: string): void;
    /**
     * Another event.
     * Define all events conveniently in one place
     */
    anotherEvent(whatever: number): void;
}> {
    public constructor(private readonly name: string) {
        super();
    }

    public setName(newName: string): void {
        const oldName = this.name;
        this.name = newName;
        // `this.emit` is a special protected property inherited from
        // `WithEventEmitter` with a method for each event.
        // Just call the method (strictly typed for IDE autocomplete, etc.)
        this.emit.nameChanged(newName, oldName);
    }
}

// Sample instance
const foo = new Foo();

// Your class itself is an `EventSource` with the "on()" method
// for subscribing to events.
const cancel = foo.on("nameChanged", (newname, oldName) => {
    // do stuff
});

// Cancel subscription
cancel();
```

## Add Events via Composition

If you either don't want to, or are unable to, use inheritence to add
events to your class, then you can do it through composition instead.

This approach guarantees that you have no conflicts between properties/methods
on your class and `WithEventEmitter`.

```ts
import { EventEmitter } from "strictly-typed-events";

class Foo {
    // Initialize a private `EventEmitter` instance, and define your
    // events in the type parameter.
    private readonly emitter = new EventEmitter<{
        /**
         * You can document your event signatures, and IDEs
         * will be able to show this documentation in various
         * contexts where you emit this event or subscribe to
         * this event.
         * @param newName - The new name.
         * @param oldName - The old name.
         */
        nameChanged(newName: string, oldName: string): void;
        /**
         * Another event.
         * Define all events conveniently in one place
         */
        anotherEvent(whatever: number): void;
    }>();

    // Also expose your `EventEmitter` publicly, but typecast
    // as just an `EventSource` that only exposes the ability
    // subscribe to events.
    public readonly events = this.emitter.asEventSource();

    public constructor(private readonly name: string) {}

    public setName(newName: string): void {
        const oldName = this.name;
        this.name = newName;
        // Use the private EventEmitter instance to emit
        // events.
        this.emitter.emit.nameChanged(newName, oldName);
    }
}

// Sample instance
const foo = new Foo();

// Use the public `events` property on your class to
// subscribe to events.
const cancel = foo.events.on("nameChanged", (newname, oldName) => {
    // do stuff
});

// Cancel subscription
cancel();
```
