import * as app from "../src/app";

describe("App tests", () => {
  const DefaultStockLevel = 5;
  const LowStockThreshold = 5;

  let pubSubService: app.IPublishSubscribeService;
  let machines: app.Machine[];
  let saleSubscriber: app.ISubscriber;
  let refillSubscriber: app.ISubscriber;

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
    test("subscribe should be idempotent", () => {});
    test("unsubscribe should be idempotent", () => {});
    test("subscribe after publish should not call ISubscriber.handle", () => {});
    test("publish after unsubscribe should not call ISubscriber.handle", () => {});
  });

  describe("MachineSaleSubscriber", () => {
    test("handle sale event already below warning threshold should not fire LowStockWarning event", () => {});
    test("handle sale event crossing below warning threshold should fire LowStockWarning event once", () => {});
    test("handle sale event still above warning threshold should not fire LowStockWarning event", () => {});
  });

  describe("MachineRefillSubscriber", () => {
    test("handle refill event already above warning threshold should not fire StockLevelOk event", () => {});
    test("handle refill event crossing above warning threshold should fire StockLevelOk event once", () => {});
    test("handle refill event still below warning threshold should not fire StockLevelOk event", () => {});
  });
});
