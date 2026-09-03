import {
  UiActionBus,
  UiActionHandler,
  UiActionListener,
} from "@/wab/client/studio-ctx/ui/UiActionBus";
import { MockInstance, MockedFunction } from "vitest";

describe("UiActionBus", () => {
  let bus: UiActionBus<string>;
  let handlerA: MockedFunction<UiActionHandler>;
  let handlerB: MockedFunction<UiActionHandler>;
  let handlerC: MockedFunction<UiActionHandler>;
  let listener: MockedFunction<UiActionListener<string>>;
  let listener2: MockedFunction<UiActionListener<string>>;
  let disposeHandlerA: () => void;
  let disposeListener: () => void;
  let warnSpy: MockInstance;
  let expectedWarnCalls: number;

  beforeEach(() => {
    vi.useFakeTimers();

    bus = new UiActionBus<string>();

    // "a" is immediately handled by handlerA
    handlerA = vi.fn();
    disposeHandlerA = bus.registerHandler("a", handlerA).dispose;

    // "b" is handled by handlerB after listener is invoked
    handlerB = vi.fn();
    listener = vi.fn((id, _type) => {
      if (id === "b") {
        bus.registerHandler("b", handlerB);
      }
    });
    disposeListener = bus.registerListener(listener).dispose;

    // handlerC and listener2 are extras used in tests
    handlerC = vi.fn();
    listener2 = vi.fn();

    expectedWarnCalls = 0;
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    expect(warnSpy).toHaveBeenCalledTimes(expectedWarnCalls);
    warnSpy.mockReset();
    vi.useRealTimers();
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

    vi.advanceTimersByTime(1_999);
    bus.registerHandler("c", handlerC);
    expect(handlerC).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke handler if registered after timeout", () => {
    bus.dispatch("c", "jump");
    expect(handlerC).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(2_000);
    bus.registerHandler("c", handlerC);
    expect(handlerC).toHaveBeenCalledTimes(0);

    expectedWarnCalls = 1;
  });

  it("invokes listener if registered within timeout", () => {
    bus.dispatch("c", "jump");
    expect(listener2).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(1_999);
    bus.registerListener(listener2);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke listener if registered after timeout", () => {
    bus.dispatch("c", "jump");
    expect(listener2).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(2_000);
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
