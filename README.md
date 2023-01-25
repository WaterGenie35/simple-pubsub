# Simple Pub-Sub

## Instructions

1. Build the Publish-Subscribe mechanism.
   Allow `ISubscriber` objects to register against a concrete `IPublishSubscribeService` object for an event type.
   Implement the publish method so that when a publish event occurs, all subscribers of that the event type published will have a chance to handle the event.
   The subscribers should be working off a shared array of `Machine` objects, mutating them depending on the event received.
2. Now add the method `unsubscribe` on `IPublishSubscribeService` to allow handlers to unsubscribe from events.
   You may change the existing method signatures.
3. Implement `MachineRefillSubscriber`.
   It will increase the stock quantity of the machine.
4. If a machine stock level drops below 3 a new `Event`, `LowStockWarningEvent` should fire.
   When the stock level hits 3 or above (because of a `MachineRefillEvent`), a `StockLevelOkEvent` should fire.
   You may want to introduce new subscribers (e.g. a new subscriber called `StockWarningSubscriber`).
   For each machine, `LowStockWarningEvent` or `StockLevelOkEvent` should only fire one time when crossing the threshold of 3.
   Remember subscribers should be notified in the order of the events that occurred.

Your program should now allow you to create `ISubscriber` objects, and register them using your `IPublishSubscribeService` implementation.
You can then create `IEvent` objects and call your `IPublishSubscribeService`'s implementations `.publish()` method.
All handlers subscribed should have their `handle` methods invoked.

Note I:
Handlers can also create new events if desired.
The events would get handled after all existing events are handled.

Note II:
If a subscriber subscribes after an event has already been published and consumed, they will not receive that event.

You may make any changes to this codebase as long as you ultimately build a Pub-Sub application capable of handling the existing machine sale and refill events.

Please share your work using a GitHub repository with @proftom.

## Development

### Running

```bash
npm start
```

- Uses `ts-node` instead of `node` so errors all point to the TS files instead.

### Formatting

- Project is configured to apply lint-staged with eslint and prettier pre-commit.
- Optionally configure development environment:
  - VSCode `settings.json` example:
    ```json
    {
      // ...
      "editor.formatOnSave": true,
      "[typescript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
    ```
- Only prettier applies the fixes and can pass through to the commit (strictly no behavioral changes). Eslint errors should be handled manually
  - E.g. manual `--fix` + inspect as opposed to having lint-staged `--fix` everything and commit in one go.

## Notes

### TypeScript

See [`typescript-notes` repo](https://github.com/WaterGenie35/typescript-notes).

### Pub-Sub

- [GCP Pub/Sub Architectural Overview](https://cloud.google.com/pubsub/architecture)
  - Event publishers should be decoupled from the receivers.
  - In our case:
    - Individual machines only care about publishing their statuses to certain events.
    - Handlers only care about handling events they've subscribed to.
- [Azure's Pub/Sub Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber)
  - In particular, see some common [issues and considerations](https://learn.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber#issues-and-considerations) for this pattern.
    - Pub/sub pattern has no ordering guarantees in general, so we must keep this in mind when implementing.
    - Duplicate messages also need to be handled for "at-most-once" delivery (or the events must be idempotent (e.g. add a "before" state that can be checked against?)).
- In practice, look into Apache Kafka, RabbitMQ, etc.

### Implementation Details

#### Subscription as `Record<EventType, Array<ISubscriber>>`

- Unless event types are dynamic, we can just use enum (or enum-like constructs) to describe them and be type-safer.
- See [`Record<Keys, Type>` doc](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type).
- `publish`, `subscribe`, `unsubscribe` are all O(sub) (sub = # of subscribers).
  - Subscription is not just O(1) if we want to also check if the subscriber is not already registered for that event.
  - Maybe switch to some kind of balanced tree structure based on some ordering of subscribers if we really need to optimize for `subscribe` and `unsubscribe`? `publish` will still be O(sub).

#### Event Side-Effects from Subscribers

- Subscribers delegate machine operations to the `Machine` class.
- The machine will be the one responsible for creating and publishing any events when appropriate.

#### Ordering Guarantees

#### At-Most-Once Guarantees

### Possible Toy Projects

- Chat application
  - Users join (subscribe to) chat rooms
  - Chat rooms broadcast (publish) to users
  - The service must then make sure not to send a user's message back to itself.

### Other Notes

- Difference between subscribing to `IEvent.type()` vs `IEvent`?
  - Just another abstraction layer?
- Store machines in a dictionary instead to facilitate the look-up?
- Where should the logic live?
  - E.g. making sure stock level is non-negative.
