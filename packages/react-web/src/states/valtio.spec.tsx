// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentInitialValue,
  hasUnstableStateInitializer,
  resetToInitialValue,
} from "./helpers";
import type { $State, $StateSpec } from "./types";
import { useDollarState } from "./valtio";

function mkComponent(
  specs: $StateSpec<any>[],
  opts?: { renderState?: boolean }
) {
  const seen = { renders: 0, $state: undefined as any };
  function Comp(props: { x?: any }) {
    seen.renders++;
    const $state = useDollarState(specs, { $props: props });
    seen.$state = $state;
    return (
      <div data-testid="val">
        {opts?.renderState === false ? "-" : String($state.val)}
      </div>
    );
  }
  return { Comp, seen };
}

const spec = (initFunc: $StateSpec<any>["initFunc"]): $StateSpec<any>[] => [
  { path: "val", type: "private", variableType: "text", initFunc },
];

// Flush the setTimeout-deferred re-render scheduled by useDollarState.
const flushDeferred = () => act(() => new Promise<void>((r) => setTimeout(r)));

const spyOnWarn = () => vi.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useDollarState with a deterministic initFunc", () => {
  // An init value derived from something the user types changes on every
  // keystroke, and must keep resetting the state every time.
  it.each([true, false])(
    "keeps resetting on every change (state rendered: %s)",
    (renderState) => {
      const warn = spyOnWarn();
      const { Comp, seen } = mkComponent(
        spec(({ $props }) => "Hello, " + $props.x),
        { renderState }
      );
      const { rerender } = render(<Comp x="" />);
      expect(seen.$state.val).toBe("Hello, ");

      let typed = "";
      for (const char of "abcdefgh") {
        typed += char;
        rerender(<Comp x={typed} />);
        expect(seen.$state.val).toBe("Hello, " + typed);
      }
      expect(warn).not.toHaveBeenCalled();
    }
  );

  it("does not reset for an init value that is equal but not identical", () => {
    const warn = spyOnWarn();
    const { Comp, seen } = mkComponent(spec(() => [{ a: 1 }]));
    const { rerender } = render(<Comp x={1} />);
    const initial = seen.$state.val;

    rerender(<Comp x={2} />);
    rerender(<Comp x={3} />);
    expect(seen.$state.val).toBe(initial);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("useDollarState with a non-deterministic initFunc", () => {
  it("keeps the current value instead of looping on Math.random()", () => {
    const warn = spyOnWarn();
    const { Comp, seen } = mkComponent(spec(() => Math.random()));
    const { rerender } = render(<Comp x={1} />);
    const settled = seen.$state.val;
    expect(typeof settled).toBe("number");
    expect(hasUnstableStateInitializer(seen.$state, ["val"])).toBe(true);
    expect(seen.renders).toBeLessThan(5);

    rerender(<Comp x={2} />);
    rerender(<Comp x={3} />);
    expect(seen.$state.val).toBe(settled);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('state "val" is not deterministic')
    );
  });

  it("stops looping on an init value that only drifts between renders", () => {
    const warn = spyOnWarn();
    // Stable within a render pass but new on the next one, like Date.now().
    let tick = 0;
    let renders = 0;
    const specs = spec(() => tick);
    function Comp() {
      renders++;
      tick = renders;
      const $state = useDollarState(specs, { $props: {} });
      return <div>{String($state.val)}</div>;
    }
    render(<Comp />);
    expect(renders).toBeLessThan(20);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('state "val" keeps changing')
    );
  });

  it("resets again once the init value becomes deterministic", async () => {
    const warn = spyOnWarn();
    const { Comp, seen } = mkComponent(
      spec(({ $props }) => ($props.x < 0 ? Math.random() : $props.x * 2))
    );
    const { rerender } = render(<Comp x={-1} />);
    const settled = seen.$state.val;
    rerender(<Comp x={-1} />);
    expect(seen.$state.val).toBe(settled);
    expect(warn).toHaveBeenCalled();

    rerender(<Comp x={5} />);
    await flushDeferred();
    expect(seen.$state.val).toBe(10);
    rerender(<Comp x={7} />);
    expect(seen.$state.val).toBe(14);
  });
});

describe("registered initializers", () => {
  it("notifies a writable state's parent after render", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const specs: $StateSpec<any>[] = [
      {
        path: "val",
        type: "writable",
        variableType: "number",
        valueProp: "value",
        onChangeProp: "onChange",
      },
    ];
    const notificationsDuringRender: number[] = [];
    let renderingChild = false;
    function Child(props: {
      value: number;
      onChange: (value: number) => void;
      initial: number;
    }) {
      renderingChild = true;
      const $state = useDollarState(specs, { $props: props });
      $state.registerInitFunc!("val", ({ $props }) => $props.initial);
      const value = $state.val;
      renderingChild = false;
      return <div data-testid="value">{value}</div>;
    }
    function Parent({ initial }: { initial: number }) {
      const [value, setValue] = React.useState(0);
      return (
        <Child
          initial={initial}
          value={value}
          onChange={(next) => {
            if (renderingChild) {
              notificationsDuringRender.push(next);
            }
            setValue(next);
          }}
        />
      );
    }
    const view = render(<Parent initial={7} />);
    await flushDeferred();
    expect(view.getByTestId("value").textContent).toBe("7");
    view.rerender(<Parent initial={9} />);
    await flushDeferred();
    expect(view.getByTestId("value").textContent).toBe("9");
    expect(notificationsDuringRender).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "bounds resets when override props drift between renders (repeated: %s)",
    async (repeated) => {
      const warn = spyOnWarn();
      const specs: $StateSpec<any>[] = [
        {
          path: repeated ? "rows[].val" : "val",
          type: "private",
          variableType: "number",
        },
      ];
      let renders = 0;
      let state: any;
      function Comp() {
        renders++;
        const $state = useDollarState(specs, { $props: {} });
        $state.registerInitFunc!(
          specs[0].path,
          ({ $props }) => $props.value,
          repeated ? [0] : undefined,
          // Cap the drift so a regression cannot hang the test runner.
          { $props: { value: Math.min(renders, 30) } }
        );
        state = repeated ? $state.rows[0] : $state;
        return <div>{String(state.val)}</div>;
      }
      render(<Comp />);
      await flushDeferred();
      expect(renders).toBeLessThan(20);
      expect(hasUnstableStateInitializer(state, ["val"])).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("keeps changing")
      );
    }
  );

  function mkRegisteredComponent(repeated: boolean) {
    const specs: $StateSpec<any>[] = [
      {
        path: repeated ? "rows[].val" : "val",
        type: "private",
        variableType: "number",
      },
    ];
    const seen = {
      $state: undefined as any,
      renders: 0,
      renderedValues: [] as any[],
    };
    function Comp(props: { init: (ctx: any) => any; ctx?: any }) {
      seen.renders++;
      const $state = useDollarState(specs, { $props: {} });
      $state.registerInitFunc!(
        specs[0].path,
        ({ $ctx }) => props.init($ctx),
        repeated ? [0] : undefined,
        { $props: {}, $ctx: props.ctx }
      );
      seen.$state = repeated ? $state.rows[0] : $state;
      const value = seen.$state.val;
      seen.renderedValues.push(value);
      return <div>{String(value)}</div>;
    }
    return { Comp, seen };
  }

  it.each([false, true])(
    "initializes unstable values after commit without looping (repeated: %s)",
    async (repeated) => {
      const warn = spyOnWarn();
      let value = 0;
      const init = (ctx: any) => ctx.offset + ++value;
      const { Comp, seen } = mkRegisteredComponent(repeated);
      const view = render(<Comp init={init} ctx={{ offset: 10 }} />);
      // Like master, registration takes effect in the layout effect.
      expect(seen.renderedValues[0]).toBeUndefined();
      expect(seen.$state.val).toBe(11);
      await flushDeferred();
      expect(seen.$state.val).toBe(11);
      expect(view.container.textContent).toBe("11");
      expect(
        seen.renderedValues
          .slice(1)
          .every((renderedValue) => renderedValue === 11)
      ).toBe(true);
      expect(seen.renders).toBeLessThan(10);
      expect(warn).toHaveBeenCalled();
    }
  );

  it.each([false, true])(
    "preserves user edits when a registration becomes unstable (repeated: %s)",
    async (repeated) => {
      const warn = spyOnWarn();
      const { Comp, seen } = mkRegisteredComponent(repeated);
      const { rerender } = render(<Comp init={() => 1} />);
      await flushDeferred();
      expect(seen.$state.val).toBe(1);
      act(() => {
        seen.$state.val = 99;
      });
      let value = 10;
      seen.renderedValues.length = 0;
      rerender(<Comp init={() => ++value} />);
      expect(seen.$state.val).toBe(99);
      await flushDeferred();
      expect(seen.$state.val).toBe(99);
      expect(
        seen.renderedValues.every((renderedValue) => renderedValue === 99)
      ).toBe(true);
      expect(warn).toHaveBeenCalled();
      rerender(<Comp init={() => 5} />);
      await flushDeferred();
      expect(seen.$state.val).toBe(5);
    }
  );

  it("refreshes the override environment when an unstable reset is rejected", async () => {
    spyOnWarn();
    const { Comp, seen } = mkRegisteredComponent(false);
    let value = 10;
    const init = (ctx: any) => (ctx.unstable ? ++value : ctx.value);
    const { rerender } = render(<Comp init={init} ctx={{ value: 1 }} />);
    await flushDeferred();
    act(() => {
      seen.$state.val = 99;
    });
    seen.renderedValues.length = 0;
    rerender(<Comp init={init} ctx={{ unstable: true }} />);
    expect(seen.$state.val).toBe(99);
    await flushDeferred();
    expect(seen.$state.val).toBe(99);
    expect(
      seen.renderedValues.every((renderedValue) => renderedValue === 99)
    ).toBe(true);
    rerender(<Comp init={init} ctx={{ value: 7 }} />);
    await flushDeferred();
    expect(seen.$state.val).toBe(7);
  });

  it("applies a registration from a child that renders on its own", async () => {
    const specs: $StateSpec<any>[] = [
      { path: "val", type: "private", variableType: "number" },
    ];
    let $state: any;
    let setCtx: (n: number) => void;
    let ownerRenders = 0;
    const Child = React.memo(function Child({ owner }: { owner: $State }) {
      const [n, setN] = React.useState(1);
      setCtx = setN;
      owner.registerInitFunc!("val", ({ $ctx }) => $ctx.n, undefined, {
        $props: {},
        $ctx: { n },
      });
      return null;
    });
    function Owner() {
      ownerRenders++;
      $state = useDollarState(specs, { $props: {} });
      return (
        <>
          <Child owner={$state} />
          <div>{String($state.val)}</div>
        </>
      );
    }
    render(<Owner />);
    await flushDeferred();
    expect($state.val).toBe(1);
    const renders = ownerRenders;
    act(() => setCtx(2));
    expect(ownerRenders).toBe(renders);
    await flushDeferred();
    expect($state.val).toBe(2);
    // Re-registering the same value does not schedule an owner render.
    const settled = ownerRenders;
    act(() => setCtx(2));
    await flushDeferred();
    expect(ownerRenders).toBe(settled);
  });

  it("keeps resetting for each keystroke from context", async () => {
    const warn = spyOnWarn();
    const { Comp, seen } = mkRegisteredComponent(true);
    const init = (ctx: any) => "Hello, " + ctx.input;
    const { rerender } = render(<Comp init={init} ctx={{ input: "" }} />);
    await flushDeferred();
    let input = "";
    for (const char of "abcdefgh") {
      input += char;
      rerender(<Comp init={init} ctx={{ input }} />);
      await flushDeferred();
      expect(seen.$state.val).toBe("Hello, " + input);
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("initializer diagnostics for the state editor", () => {
  it("does not flag ordinary values or deterministic initializers", () => {
    expect(hasUnstableStateInitializer({}, ["val"])).toBe(false);
    const { Comp, seen } = mkComponent(spec(({ $props }) => $props.x));
    const { rerender } = render(<Comp x={1} />);
    expect(hasUnstableStateInitializer(seen.$state, ["val"])).toBe(false);
    rerender(<Comp x={2} />);
    expect(hasUnstableStateInitializer(seen.$state, ["val"])).toBe(false);
  });

  it("clears a detected problem when the canvas initializer is corrected", () => {
    spyOnWarn();
    let value = 0;
    let $state: any;
    const unstable = () => ++value;
    const stable = () => 42;
    function Comp({ corrected }: { corrected: boolean }) {
      const specs = spec(corrected ? stable : unstable).map((stateSpec) => ({
        ...stateSpec,
        initFuncHash: corrected ? "stable" : "unstable",
      }));
      $state = useDollarState(specs, { $props: {} }, { inCanvas: true });
      $state.eagerInitializeStates(specs);
      return <div>{String($state.val)}</div>;
    }
    const { rerender } = render(<Comp corrected={false} />);
    expect(hasUnstableStateInitializer($state, ["val"])).toBe(true);
    rerender(<Comp corrected />);
    expect($state.val).toBe(42);
    expect(hasUnstableStateInitializer($state, ["val"])).toBe(false);
  });
});

it("bounds unsettled resets even when renders take over 100 ms", () => {
  const warn = spyOnWarn();
  let now = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  let renders = 0;
  const specs = spec(() => Date.now());
  function Comp() {
    renders++;
    now += 101;
    // Stop a regression without leaving the test runner in an infinite loop.
    if (renders > 25) {
      throw new Error("Initializer failed to settle");
    }
    const $state = useDollarState(specs, { $props: {} });
    return <div>{String($state.val)}</div>;
  }
  render(<Comp />);
  expect(renders).toBeLessThan(20);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("keeps changing"));
});

it("allows consecutive input events to update derived state", () => {
  const warn = spyOnWarn();
  const specs = spec(({ $props }) => "Hello, " + $props.value);
  function Comp() {
    const [value, setValue] = React.useState("");
    const $state = useDollarState(specs, { $props: { value } });
    return (
      <>
        <input
          aria-label="value"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div data-testid="derived">{$state.val}</div>
      </>
    );
  }
  const view = render(<Comp />);
  let value = "";
  for (const char of "abcdefgh") {
    value += char;
    fireEvent.change(view.getByLabelText("value"), { target: { value } });
    expect(view.getByTestId("derived").textContent).toBe("Hello, " + value);
  }
  expect(warn).not.toHaveBeenCalled();
});

describe("rejected initializer probes", () => {
  it("preserves the preview baseline and applies a previously rejected value once stable", async () => {
    spyOnWarn();
    let value = 0;
    let stable: number | undefined = undefined;
    const { Comp, seen } = mkComponent(spec(() => stable ?? ++value));
    const { rerender } = render(<Comp />);
    const installed = seen.$state.val;
    expect(getCurrentInitialValue(seen.$state, ["val"])).toBe(installed);
    act(() => {
      seen.$state.val = 99;
    });
    await flushDeferred();
    act(() => {
      resetToInitialValue(seen.$state, ["val"]);
    });
    expect(seen.$state.val).toBe(installed);
    await flushDeferred();
    expect(getCurrentInitialValue(seen.$state, ["val"])).toBe(installed);
    stable = value - 1;
    rerender(<Comp />);
    await flushDeferred();
    expect(seen.$state.val).toBe(stable);
    expect(getCurrentInitialValue(seen.$state, ["val"])).toBe(stable);
  });

  it.each(["spec", "registered", "repeated"])(
    "recovers after exhausting the reset budget (%s)",
    async (kind) => {
      spyOnWarn();
      let renders = 0;
      let tick = 0;
      let drifting = true;
      let state: any;
      const init = () => tick;
      const specs: $StateSpec<any>[] = [
        {
          path: kind === "repeated" ? "rows[].val" : "val",
          type: "private",
          variableType: "number",
          ...(kind === "spec" ? { initFunc: init } : {}),
        },
      ];
      function Comp() {
        renders++;
        if (renders > 30) {
          throw new Error("Initializer failed to settle");
        }
        if (drifting) {
          tick++;
        }
        const $state = useDollarState(specs, { $props: {} });
        if (kind !== "spec") {
          $state.registerInitFunc!(
            specs[0].path,
            init,
            kind === "repeated" ? [0] : undefined
          );
        }
        state = kind === "repeated" ? $state.rows[0] : $state;
        return <div>{String(state.val)}</div>;
      }
      const { rerender } = render(<Comp />);
      rerender(<Comp />);
      await flushDeferred();
      expect(hasUnstableStateInitializer(state, ["val"])).toBe(true);
      expect(renders).toBeLessThan(20);
      expect(state.val).not.toBe(tick);
      expect(getCurrentInitialValue(state, ["val"])).toBe(state.val);
      drifting = false;
      rerender(<Comp />);
      await flushDeferred();
      expect(state.val).toBe(tick);
      expect(getCurrentInitialValue(state, ["val"])).toBe(tick);
      tick += 10;
      rerender(<Comp />);
      await flushDeferred();
      expect(state.val).toBe(tick);
    }
  );
});
