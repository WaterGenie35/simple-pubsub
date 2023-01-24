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

Your program should now allow you to create `ISubscriber` objects, and register them using your `IPublishSubscribeService` implementation. You can then create `IEvent` objects and call your `IPublishSubscribeService`'s implementations `.publish()` method. All handlers subscribed should have their `handle` methods invoked.

Note I: Handlers can also create new events if desired. The events would get handled after all existing events are handled.

Note II: If a subscriber subscribes after an event has already been published and consumed, they will not receive that event.

You may make any changes to this codebase as long as you ultimately build a Pub-Sub application capable of handling the existing machine sale and refill events.

Please share your work using a GitHub repository with @proftom.

## Development

## Notes

### TypeScript
See [`typescript-notes` repo](https://github.com/WaterGenie35/typescript-notes).

### Pub-Sub
- [GCP Pub/Sub Architectural Overview](https://cloud.google.com/pubsub/architecture)
    - Event publishers should be decoupled from the receivers.
    - In our case:
        - Individual machines only care about publishing their statuses to certain events.
        - Handlers only care about subscribing to events they are interested in.
