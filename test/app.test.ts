beforeAll(() => {
  // One-time setup
});

beforeEach(() => {
  // Repeating setup
});

describe("PublishSubscribeService", () => {
  test("publish should call ISubscriber.handle on and only on all related subscribers", () => {
    expect(1).toBe(2);
  });
  test("subscribe should be idempotent", () => {
    expect(1).toBe(2);
  });
  test("unsubscribe should be idempotent", () => {
    expect(1).toBe(2);
  });
  test("subscribe after publish should not call ISubscriber.handle", () => {
    expect(1).toBe(2);
  });
  test("publish after unsubscribe should not call ISubscriber.handle", () => {
    expect(1).toBe(2);
  });
});

describe("MachineSaleSubscriber", () => {
  test("handle sale event already below warning threshold should not fire LowStockWarning event", () => {
    expect(1).toBe(2);
  });
  test("handle sale event crossing below warning threshold should fire LowStockWarning event once", () => {
    expect(1).toBe(2);
  });
  test("handle sale event still above warning threshold should not fire LowStockWarning event", () => {
    expect(1).toBe(2);
  });
});

describe("MachineRefillSubscriber", () => {
  test("handle refill event already above warning threshold should not fire StockLevelOk event", () => {
    expect(1).toBe(2);
  });
  test("handle refill event crossing above warning threshold should fire StockLevelOk event once", () => {
    expect(1).toBe(2);
  });
  test("handle refill event still below warning threshold should not fire StockLevelOk event", () => {
    expect(1).toBe(2);
  });
});
