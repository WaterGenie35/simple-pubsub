// constants/enums
enum EventType {
  Sale,
  Refill,
  LowStockWarning,
  StockLevelOk,
}

// interfaces
/**
 * Describes an event that can be published to the pub-sub service.
 */
interface IEvent {
  type: () => EventType;
  machineId: () => string;
}

/**
 * Handles incoming events from the pub-sub service.
 */
interface ISubscriber {
  handle: (event: IEvent) => void;
}

/**
 * Processes incoming events and broadcast them to all registered subscribers.
 */
interface IPublishSubscribeService {
  /**
   * Publishes the event to all registered subscribers.
   * Will have no effect if there are no subscribers registered to the corresponding event type.
   */
  publish: (event: IEvent) => void;

  /**
   * Registers the handler to the event type.
   * Registered handlers will be called every time an event of the corresponding type gets published.
   * Will have no effect if the handler is already registered to the event type.
   */
  subscribe: (eventType: EventType, handler: ISubscriber) => void;

  /**
   * Un-registers the handler from the event type.
   * Un-registered handlers will no longer be called when an event of the corresponding type gets published.
   * Will have no effect if the handler is not registered to the event type in the first place.
   */
  unsubscribe: (eventType: EventType, handler: ISubscriber) => void;
}

// implementations
class PublishSubscribeService implements IPublishSubscribeService {
  private readonly subscriptions: Partial<Record<EventType, ISubscriber[]>> = {};

  publish(event: IEvent): void {
    const eventType = event.type();
    if (eventType in this.subscriptions) {
      this.subscriptions[eventType]?.forEach((subscriber) => {
        subscriber.handle(event);
      });
    }
  }

  subscribe(eventType: EventType, handler: ISubscriber): void {
    let subscribers = this.subscriptions[eventType];
    if (subscribers === undefined) {
      subscribers = [handler];
    } else if (subscribers.indexOf(handler) !== -1) {
      subscribers.push(handler);
    }
  }

  unsubscribe(eventType: EventType, handler: ISubscriber): void {
    const subscribers = this.subscriptions[eventType];
    if (subscribers !== undefined) {
      const handlerIndex = subscribers.indexOf(handler);
      if (handlerIndex !== -1) {
        subscribers.splice(handlerIndex, 1);
      }
    }
  }
}

class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold;
  }

  type(): EventType {
    return EventType.Sale;
  }
}

class MachineRefillEvent implements IEvent {
  constructor(private readonly _refill: number, private readonly _machineId: string) {}

  machineId(): string {
    throw new Error("Method not implemented.");
  }

  type(): EventType {
    return EventType.Refill;
  }
}

/**
 * Handles sale operations.
 */
class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: IEvent): void {
    if (event instanceof MachineSaleEvent) {
      this.machines[2].stockLevel -= event.getSoldQuantity();
    }
  }
}

/**
 * Handles refilling operations.
 */
class MachineRefillSubscriber implements ISubscriber {
  handle(event: IEvent): void {
    throw new Error("Method not implemented.");
  }
}

// objects
class Machine {
  public stockLevel = 10;
  public id: string;

  constructor(id: string) {
    this.id = id;
  }
}

// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return "001";
  } else if (random < 2) {
    return "002";
  }
  return "003";
};

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
};

// program
(async () => {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [new Machine("001"), new Machine("002"), new Machine("003")];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines);

  // create the PubSub service
  const pubSubService: IPublishSubscribeService = null as unknown as IPublishSubscribeService; // implement and fix this

  // create 5 random events
  const events = [1, 2, 3, 4, 5].map((i) => eventGenerator());

  // publish the events
  events.map(pubSubService.publish);
})();
