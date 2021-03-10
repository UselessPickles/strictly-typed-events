# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.6] 2021-03-09

## Added

-   Support for `unique symbol` event names to the `EventSource.subscribe()` method.

## [0.0.5] 2021-03-08

### Changed

-   Reworked/simplified implementation of `EventEmitter` by extracting some of the code
    into an abstract base class.
-   Reworked `EventSource` interface so that there are now 3 distinct methods for subscribing:
    -   `on()`: Subscribe to a single event by name
        -   Supports `unique symbol` event names!
    -   `once()`: Subscribe to a single event by name with a one-time-only handler.
        -   Supports `unique symbol` event names!
    -   `subscribe()`: Subscribe to one or more events via an object keyed by event name.
        -   Wrap the handler implementation with the new `once()` function to mark it as a one-time-only handler.
        -   Supports string event names only.
-   Distributed code is now bundled with rollup.
-   Signatures of events MUST have a return type of `void` now. Previously could be
    any type.
-   Implementations of handlers may now return a `Promise<void>` (allows for async implementations).
-   Simplified code related to storing/executing one-time subscriptions.
-   Event handlers are now always called without a `this` context for simplicity.

### Removed

-   `onSubscribe` handler support in `EventEmitter`. This was an interesting experiment,
    but I've deemed it have no real value and not worth the complexity.

## [0.0.4] 2021-03-05

### Added

-   `EventsType` helper type for extracting the `Events` interface from any `EventSource` type.
-   Basic usage examples/patterns in README.

### Changed

-   Renamed project to `strictly-typed-events` to match NPM package name.
-   Renamed `EventSource.subscribe` method to `EventSource.on` (cascades down to all implementations of the interface too).
-   Renamed `EventPublisher` to `EventEmitter`.
    -   Renamed property `publish` to `emit`.
-   Renamed `WithEventPublisher` to `WithEventEmitter`.
    -   Renamed property `publish` to `emit`.

## [0.0.3] 2021-03-04

### Changed

-   Changed NPM package name to `strictly-typed-events` (v0.0.2 is actually published under this name)

## [0.0.2] 2021-03-04

### Changed

-   Rename project and npm package to `ts-event-emitter` (FAILED; name not accepted by NPM).
-   Retroactively re-published as `strictly-typed-events`.

## [0.0.1] 2021-03-03

Initial release.

TODO:

-   Finalize naming/terminology.
-   Write good README content (sorry; source code documentation will have to suffice for now).
-   Use rollup to bundle code?

[0.0.6]: https://github.com/UselessPickles/strictly-typed-events/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/UselessPickles/strictly-typed-events/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/UselessPickles/strictly-typed-events/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/UselessPickles/strictly-typed-events/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/UselessPickles/strictly-typed-events/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/UselessPickles/strictly-typed-events/tree/v0.0.1
