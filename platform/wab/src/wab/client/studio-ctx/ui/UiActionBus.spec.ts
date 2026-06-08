import {
  UiActionBus,
  UiActionHandler,
  UiActionListener,
} from "@/wab/client/studio-ctx/ui/UiActionBus";

describe("UiActionBus", () => {
  let bus: UiActionBus<string>;
  let handlerA: jest.MockedFunction<UiActionHandler>;
  let handlerB: jest.MockedFunction<UiActionHandler>;
  let handlerC: jest.MockedFunction<UiActionHandler>;
  let listener: jest.MockedFunction<UiActionListener<string>>;
  let listener2: jest.MockedFunction<UiActionListener<string>>;
  let disposeHandlerA: () => void;
  let disposeListener: () => void;
  let warnSpy: jest.SpyInstance;
  let expectedWarnCalls: number;

  beforeEach(() => {
    jest.useFakeTimers();

    bus = new UiActionBus<string>();

    // "a" is immediately handled by handlerA
    handlerA = jest.fn();
    disposeHandlerA = bus.registerHandler("a", handlerA).dispose;

    // "b" is handled by handlerB after listener is invoked
    handlerB = jest.fn();
    listener = jest.fn((id, _type) => {
      if (id === "b") {
        bus.registerHandler("b", handlerB);
      }
    });
    disposeListener = bus.registerListener(listener).dispose;

    // handlerC and listener2 are extras used in tests
    handlerC = jest.fn();
    listener2 = jest.fn();

    expectedWarnCalls = 0;
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    expect(warnSpy).toHaveBeenCalledTimes(expectedWarnCalls);
    warnSpy.mockReset();
    jest.useRealTimers();
  });

  it("invokes handler if registered", () => {
    bus.dispatch("a", "jump");

    expect(handlerA).toHaveBeenCalledWith("jump");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(0);
  });

  it("invokes listener first if not registered, then invokes handler", () => {
    bus.dispatch("b", "blink");

    expect(listener).toHaveBeenCalledWith("b", "blink");
    expect(handlerB).toHaveBeenCalledWith("blink");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(handlerA).toHaveBeenCalledTimes(0);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it("invokes multiple listeners", () => {
    bus.registerListener(listener2);

    bus.dispatch("b", "blink");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it("invokes handler is registered within timeout", () => {
    bus.dispatch("c", "jump");
    expect(handlerC).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1_999);
    bus.registerHandler("c", handlerC);
    expect(handlerC).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke handler if registered after timeout", () => {
    bus.dispatch("c", "jump");
    expect(handlerC).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(2_000);
    bus.registerHandler("c", handlerC);
    expect(handlerC).toHaveBeenCalledTimes(0);

    expectedWarnCalls = 1;
  });

  it("invokes listener if registered within timeout", () => {
    bus.dispatch("c", "jump");
    expect(listener2).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1_999);
    bus.registerListener(listener2);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke listener if registered after timeout", () => {
    bus.dispatch("c", "jump");
    expect(listener2).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(2_000);
    bus.registerListener(listener2);
    expect(listener2).toHaveBeenCalledTimes(0);

    expectedWarnCalls = 1;
  });

  it("disposes handler", () => {
    disposeHandlerA();

    bus.dispatch("a", "jump");
    expect(handlerA).toHaveBeenCalledTimes(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("disposes listener", () => {
    disposeListener();

    bus.dispatch("b", "jump");
    expect(handlerB).toHaveBeenCalledTimes(0);
    expect(listener).toHaveBeenCalledTimes(0);
  });
});
