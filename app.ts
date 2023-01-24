// Enums
enum EventType {
  Sale,
  Refill,
  LowStockWarning,
  StockLevelOk,
}

// Interfaces
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
  /**
   * May have no effect for event types the subscriber is not interested in.
   */
  handle: (event: IEvent) => void;

  toString: () => string;
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

// Implementations
class PublishSubscribeService implements IPublishSubscribeService {
  private readonly _subscriptions: Partial<Record<EventType, ISubscriber[]>> = {};

  publish(event: IEvent): void {
    const eventType = event.type();
    if (eventType in this._subscriptions) {
      this._subscriptions[eventType]?.forEach((handler) => {
        console.log(`[Service]: Delegating ${eventType} handling to ${handler.toString()}...`);
        handler.handle(event);
      });
    }
  }

  subscribe(eventType: EventType, handler: ISubscriber): void {
    let subscribers = this._subscriptions[eventType];
    if (subscribers === undefined) {
      subscribers = [handler];
      console.log(`[Service]: Subscribed ${handler.toString()} to ${eventType}.`);
    } else if (subscribers.indexOf(handler) !== -1) {
      subscribers.push(handler);
      console.log(`[Service]: Subscribed ${handler.toString()} to ${eventType}.`);
    }
  }

  unsubscribe(eventType: EventType, handler: ISubscriber): void {
    const subscribers = this._subscriptions[eventType];
    if (subscribers !== undefined) {
      const handlerIndex = subscribers.indexOf(handler);
      if (handlerIndex !== -1) {
        subscribers.splice(handlerIndex, 1);
        console.log(`[Service]: Unsubscribed ${handler.toString()} from ${eventType}.`);
      }
    }
  }
}

// Events
abstract class MachineEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  abstract type(): EventType;

  machineId(): string {
    return this._machineId;
  }
}

class MachineSaleEvent extends MachineEvent {
  constructor(_machineId: string, private readonly _sold: number) {
    super(_machineId);
  }

  type(): EventType {
    return EventType.Sale;
  }

  getSoldQuantity(): number {
    return this._sold;
  }
}

class MachineRefillEvent extends MachineEvent {
  constructor(_machineId: string, private readonly _refill: number) {
    super(_machineId);
  }

  type(): EventType {
    return EventType.Refill;
  }

  getRefillQuantity(): number {
    return this._refill;
  }
}

class MachineLowStockWarningEvent extends MachineEvent {
  type(): EventType {
    return EventType.LowStockWarning;
  }
}

class MachineStockLevelOkEvent extends MachineEvent {
  type(): EventType {
    return EventType.StockLevelOk;
  }
}

// Subscribers
abstract class MachineSubscriber implements ISubscriber {
  constructor(public machines: Machine[]) {}

  abstract handle(event: IEvent): void;

  getEventMachine(event: IEvent): Machine | undefined {
    const machineIndex = this.machines.map((machine) => machine.id).indexOf(event.machineId());
    if (machineIndex !== -1) {
      return this.machines[machineIndex];
    }
  }

  toString(): string {
    return this.constructor.name;
  }
}

class MachineSaleSubscriber extends MachineSubscriber {
  handle(event: IEvent): void {
    if (event instanceof MachineSaleEvent) {
      const machine = this.getEventMachine(event);
      if (machine !== undefined) {
        const amountSold = event.getSoldQuantity();
        machine.consumeStock(amountSold);
        console.log(`[SaleSubscriber]: Sold ${amountSold} on machine ${machine.id}.`);
      }
    }
  }
}

class MachineRefillSubscriber extends MachineSubscriber {
  handle(event: IEvent): void {
    if (event instanceof MachineRefillEvent) {
      const machine = this.getEventMachine(event);
      if (machine !== undefined) {
        const refillAmount = event.getRefillQuantity();
        machine.refillStock(refillAmount);
        console.log(`[RefillSubscriber]: Refilled ${refillAmount} on machine ${machine.id}.`);
      }
    }
  }
}

class MachineLowStockWarningSubscriber extends MachineSubscriber {
  handle(event: IEvent): void {
    if (event instanceof MachineLowStockWarningEvent) {
      console.log(`[LowStockWarningSubscriber]: Received LowStockWarning event from machine ${event.machineId()}.`);
    }
  }
}

class MachineStockLevelOkSubscriber extends MachineSubscriber {
  handle(event: IEvent): void {
    if (event instanceof MachineStockLevelOkEvent) {
      console.log(`[StockLevelOkSubscriber]: Received StockLevelOk event from machine ${event.machineId()}.`);
    }
  }
}

// Objects
class Machine {
  public static readonly LowStockThreshold = 2; // Inclusive; low stock in the [0, 2] range.

  public stockLevel = 10;
  public id: string;
  public pubSubService: IPublishSubscribeService;

  constructor(id: string, pubSubService: IPublishSubscribeService) {
    this.id = id;
    this.pubSubService = pubSubService;
  }

  private _addStock(amount: number): void {
    if (amount === 0) {
      return;
    }
    const oldStockLevel = this.stockLevel;
    const newStockLevel = oldStockLevel + amount;
    this.stockLevel = newStockLevel;
    console.log(`[Machine]: Adjusted stock for machine ${this.id} from ${oldStockLevel} to ${newStockLevel}.`);

    const goesAboveThreshold = oldStockLevel <= Machine.LowStockThreshold && newStockLevel > Machine.LowStockThreshold;
    const goesBelowThreshold = oldStockLevel > Machine.LowStockThreshold && newStockLevel <= Machine.LowStockThreshold;
    if (goesAboveThreshold) {
      const stockLevelOkEvent = new MachineStockLevelOkEvent(this.id);
      this.pubSubService.publish(stockLevelOkEvent);
      console.log(`[Machine]: Published StockLevelOk event from machine ${this.id}.`);
    } else if (goesBelowThreshold) {
      const lowStockWarningEvent = new MachineLowStockWarningEvent(this.id);
      this.pubSubService.publish(lowStockWarningEvent);
      console.log(`[Machine]: Published LowStockWarning event from machine ${this.id}.`);
    }
  }

  public refillStock(amount: number): void {
    this._addStock(amount);
  }

  public consumeStock(amount: number): void {
    // Should check if amount <= stock level.
    // E.g. consume down to 0 and fire OutOfStockEvent?
    this._addStock(-amount);
  }
}

// Helpers
const randomMachine = (machines: Machine[]): string => {
  const sampleMachine = machines[Math.floor(Math.random() * machines.length)];
  return sampleMachine.id;
};

const randomIntInclusive = (min: number, max: number): number => {
  // https://stackoverflow.com/a/7228322/19566965
  return Math.floor(min + Math.random() * (max - min + 1));
};

const eventGenerator = (machines: Machine[]): IEvent => {
  const random = Math.random();
  const sampleMachineId = randomMachine(machines);
  if (random < 0.5) {
    const saleQty = randomIntInclusive(1, 2);
    const saleEvent = new MachineSaleEvent(sampleMachineId, saleQty);
    console.log(`[EventGenerator]: Created new sale event with quantity ${saleQty} for machine ${sampleMachineId}`);
    return saleEvent;
  }
  const refillQty = randomIntInclusive(3, 5);
  const refillEvent = new MachineRefillEvent(sampleMachineId, refillQty);
  console.log(`[EventGenerator]: Created new refill event with quantity ${refillQty} for machine ${sampleMachineId}`);
  return refillEvent;
};

// Program
(async () => {
  // Create the PubSub service
  const pubSubService: IPublishSubscribeService = new PublishSubscribeService();

  // Create 3 machines with a quantity of 10 stock (default)
  const machines: Machine[] = ["001", "002", "003"].map((id, i) => new Machine(id, pubSubService));

  // Create subscribers
  // Inject the machines (all subscribers should do this)
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const saleSubscriber = new MachineSaleSubscriber(machines);
  const refillSubscriber = new MachineRefillSubscriber(machines);
  const lowStockWarningSubscriber = new MachineLowStockWarningSubscriber(machines);
  const StockLevelOkSubscriber = new MachineStockLevelOkSubscriber(machines);
  /* eslint-enable @typescript-eslint/no-unused-vars */

  // Create 5 random events
  const events = [...Array(5)].map((x, i) => eventGenerator(machines));

  // Publish the events
  events.map(pubSubService.publish);
})();
