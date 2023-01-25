import * as app from "../src/app";

describe("App tests", () => {
  const DefaultStockLevel = 5;
  const LowStockThreshold = 2;

  let pubSubService: app.IPublishSubscribeService;
  let machines: app.Machine[];
  let saleSubscriber: app.ISubscriber;
  let refillSubscriber: app.ISubscriber;
  let lowStockWarningSubscriber: app.ISubscriber;
  let stockLevelOkSubscriber: app.ISubscriber;

  // One-time
  beforeAll(() => {
    pubSubService = new app.PublishSubscribeService();

    const machineIds: string[] = ["001", "002"];
    machines = machineIds.map((id, i) => {
      const machine = new app.Machine(id, pubSubService);
      machine.stockLevel = DefaultStockLevel;
      return machine;
    });
    Object.defineProperty(app.Machine, "LowStockThreshold", {
      get: jest.fn(() => LowStockThreshold),
    });

    saleSubscriber = new app.MachineSaleSubscriber(machines);
    refillSubscriber = new app.MachineRefillSubscriber(machines);
    lowStockWarningSubscriber = new app.MachineLowStockWarningSubscriber(machines);
    stockLevelOkSubscriber = new app.MachineStockLevelOkSubscriber(machines);
  });

  // Repeating
  afterEach(() => {
    jest.clearAllMocks();

    // Reset machine stock level
    machines?.forEach((machine) => {
      machine.stockLevel = DefaultStockLevel;
    });

    // Clear subscriptions
    // This kinda assumes IPublishSubscribeService.unsubscribe is already working;
    // Try to find other approach?
    pubSubService?.unsubscribe(app.EventType.Sale, saleSubscriber);
    pubSubService?.unsubscribe(app.EventType.Refill, refillSubscriber);
    pubSubService?.unsubscribe(app.EventType.LowStockWarning, lowStockWarningSubscriber);
    pubSubService?.unsubscribe(app.EventType.StockLevelOk, stockLevelOkSubscriber);
  });

  describe("PublishSubscribeService", () => {
    test("publish should call ISubscriber.handle on and only on all related subscribers", () => {
      const relatedEventType = app.EventType.Sale;
      const unrelatedEventType = app.EventType.Refill;
      const relatedSubscriber1 = new app.MachineSaleSubscriber(machines);
      const relatedSubscriber2 = new app.MachineSaleSubscriber(machines);
      const unrelatedSubscriber = new app.MachineRefillSubscriber(machines);
      pubSubService.subscribe(relatedEventType, relatedSubscriber1);
      pubSubService.subscribe(relatedEventType, relatedSubscriber2);
      pubSubService.subscribe(unrelatedEventType, unrelatedSubscriber);
      const relatedEvent = new app.MachineSaleEvent("001", 1);
      const mockRelatedHandle1 = jest.spyOn(relatedSubscriber1, "handle");
      const mockRelatedHandle2 = jest.spyOn(relatedSubscriber2, "handle");
      const mockUnrelatedHandle = jest.spyOn(unrelatedSubscriber, "handle");

      pubSubService.publish(relatedEvent);

      expect(mockRelatedHandle1.mock.calls).toHaveLength(1);
      expect(mockRelatedHandle2.mock.calls).toHaveLength(1);
      expect(mockUnrelatedHandle.mock.calls).toHaveLength(0);
    });
    test("publish multiple events should call ISubscriber.handle in the same order", () => {
      const event1 = new app.MachineSaleEvent("001", 1);
      const event2 = new app.MachineSaleEvent("001", 2);
      const event3 = new app.MachineSaleEvent("001", 3);
      pubSubService.subscribe(app.EventType.Sale, saleSubscriber);
      const mockHandler = jest.spyOn(saleSubscriber, "handle");

      pubSubService.publish(event1);
      pubSubService.publish(event2);
      pubSubService.publish(event3);

      expect(mockHandler.mock.calls).toHaveLength(3);
      const handledEvent1 = mockHandler.mock.calls[0][0] as app.MachineSaleEvent;
      const handledEvent2 = mockHandler.mock.calls[1][0] as app.MachineSaleEvent;
      const handledEvent3 = mockHandler.mock.calls[2][0] as app.MachineSaleEvent;
      expect(handledEvent1.getSoldQuantity()).toBe(1);
      expect(handledEvent2.getSoldQuantity()).toBe(2);
      expect(handledEvent3.getSoldQuantity()).toBe(3);
    });
    test("subscribe should be idempotent", () => {
      // Strategy:
      // 1. Assert starting state
      // 2. Know the goal state
      // 3. Run more than once
      // 4. Assert goal state (as if ran once)
      // In this case, after repeated subscription, publishing an event should still result in 1 handle call.
      const event = new app.MachineSaleEvent("001", 1);
      const mockHandler = jest.spyOn(saleSubscriber, "handle");

      pubSubService.subscribe(app.EventType.Sale, saleSubscriber);
      pubSubService.publish(event);
      expect(mockHandler.mock.calls).toHaveLength(1);
      mockHandler.mockClear();

      pubSubService.subscribe(app.EventType.Sale, saleSubscriber);
      pubSubService.subscribe(app.EventType.Sale, saleSubscriber);
      pubSubService.subscribe(app.EventType.Sale, saleSubscriber);
      pubSubService.publish(event);
      expect(mockHandler.mock.calls).toHaveLength(1);
    });
    test("unsubscribe should be idempotent", () => {
      // For unsubscription, we are just checking if subsequent calls doesn't complain?
      const event = new app.MachineSaleEvent("001", 1);
      const mockHandler = jest.spyOn(saleSubscriber, "handle");
      pubSubService.subscribe(app.EventType.Sale, saleSubscriber);

      expect(() => {
        pubSubService.unsubscribe(app.EventType.Sale, saleSubscriber);
        pubSubService.unsubscribe(app.EventType.Sale, saleSubscriber);
        pubSubService.unsubscribe(app.EventType.Sale, saleSubscriber);
      }).not.toThrowError();
      pubSubService.publish(event);
      expect(mockHandler.mock.calls).toHaveLength(0);
    });
    test("subscribe after publish should not call ISubscriber.handle", () => {
      const event = new app.MachineSaleEvent("001", 1);
      const mockHandler = jest.spyOn(saleSubscriber, "handle");

      pubSubService.publish(event);
      pubSubService.subscribe(app.EventType.Sale, saleSubscriber);

      expect(mockHandler.mock.calls).toHaveLength(0);
    });
    test("publish after unsubscribe should not call ISubscriber.handle", () => {
      // Already covered by unsubscribe idempotence test above.
    });
  });

  describe("MachineSaleSubscriber", () => {
    test("handle sale event already below warning threshold should not fire LowStockWarning event", () => {
      const machineId = "refill_me";
      const machine = new app.Machine(machineId, pubSubService);
      machine.stockLevel = 2;
      machines.push(machine);
      const saleEvent = new app.MachineSaleEvent(machineId, 1);
      const mockPublish = jest.spyOn(pubSubService, "publish");

      pubSubService.publish(saleEvent);

      expect(mockPublish.mock.calls).toHaveLength(1);
      const publishedEvent = mockPublish.mock.calls[0][0];
      expect(publishedEvent instanceof app.MachineSaleEvent);
    });
    test("handle sale event crossing below warning threshold should fire LowStockWarning event once", () => {
      const machineId = "just_ran_out";
      const machine = new app.Machine(machineId, pubSubService);
      machine.stockLevel = 3;
      machines.push(machine);
      const saleEvent = new app.MachineSaleEvent(machineId, 1);
      const mockPublish = jest.spyOn(pubSubService, "publish");

      pubSubService.publish(saleEvent); // 1. sale event + 2. low stock event
      pubSubService.publish(saleEvent); // 3. sale event
      pubSubService.publish(saleEvent); // 4. sale event

      expect(mockPublish.mock.calls).toHaveLength(4);
      const publishedEvent1 = mockPublish.mock.calls[0][0];
      const publishedEvent2 = mockPublish.mock.calls[1][0];
      const publishedEvent3 = mockPublish.mock.calls[2][0];
      const publishedEvent4 = mockPublish.mock.calls[3][0];
      expect(publishedEvent1 instanceof app.MachineSaleEvent);
      expect(publishedEvent2 instanceof app.MachineLowStockWarningEvent);
      expect(publishedEvent3 instanceof app.MachineSaleEvent);
      expect(publishedEvent4 instanceof app.MachineSaleEvent);
    });
    test("handle sale event still above warning threshold should not fire LowStockWarning event", () => {
      const machineId = "all_good";
      const machine = new app.Machine(machineId, pubSubService);
      machine.stockLevel = 10;
      machines.push(machine);
      const saleEvent = new app.MachineSaleEvent(machineId, 1);
      const mockPublish = jest.spyOn(pubSubService, "publish");

      pubSubService.publish(saleEvent);

      expect(mockPublish.mock.calls).toHaveLength(1);
      const publishedEvent = mockPublish.mock.calls[0][0];
      expect(publishedEvent instanceof app.MachineSaleEvent);
    });
  });

  describe("MachineRefillSubscriber", () => {
    test("handle refill event already above warning threshold should not fire StockLevelOk event", () => {
      const machineId = "all_good";
      const machine = new app.Machine(machineId, pubSubService);
      machine.stockLevel = 10;
      machines.push(machine);
      const refillEvent = new app.MachineRefillEvent(machineId, 1);
      const mockPublish = jest.spyOn(pubSubService, "publish");

      pubSubService.publish(refillEvent);

      expect(mockPublish.mock.calls).toHaveLength(1);
      const publishedEvent = mockPublish.mock.calls[0][0];
      expect(publishedEvent instanceof app.MachineRefillEvent);
    });
    test("handle refill event crossing above warning threshold should fire StockLevelOk event once", () => {
      const machineId = "just_in_time";
      const machine = new app.Machine(machineId, pubSubService);
      machine.stockLevel = 2;
      machines.push(machine);
      const refillEvent = new app.MachineRefillEvent(machineId, 1);
      const mockPublish = jest.spyOn(pubSubService, "publish");

      pubSubService.publish(refillEvent); // 1. refill event + 2. stock level ok event
      pubSubService.publish(refillEvent); // 3. refill event
      pubSubService.publish(refillEvent); // 4. refill event

      expect(mockPublish.mock.calls).toHaveLength(4);
      const publishedEvent1 = mockPublish.mock.calls[0][0];
      const publishedEvent2 = mockPublish.mock.calls[1][0];
      const publishedEvent3 = mockPublish.mock.calls[2][0];
      const publishedEvent4 = mockPublish.mock.calls[3][0];
      expect(publishedEvent1 instanceof app.MachineRefillEvent);
      expect(publishedEvent2 instanceof app.MachineStockLevelOkEvent);
      expect(publishedEvent3 instanceof app.MachineRefillEvent);
      expect(publishedEvent4 instanceof app.MachineRefillEvent);
    });
    test("handle refill event still below warning threshold should not fire StockLevelOk event", () => {
      const machineId = "need_more";
      const machine = new app.Machine(machineId, pubSubService);
      machine.stockLevel = 1;
      machines.push(machine);
      const refillEvent = new app.MachineRefillEvent(machineId, 1);
      const mockPublish = jest.spyOn(pubSubService, "publish");

      pubSubService.publish(refillEvent);

      expect(mockPublish.mock.calls).toHaveLength(1);
      const publishedEvent = mockPublish.mock.calls[0][0];
      expect(publishedEvent instanceof app.MachineRefillEvent);
    });
  });
});
