import { syncPreview } from "@/wab/client/components/live/preview-sync";
import {
  LiveFrame,
  PreviewRender,
  PreviewUpdate,
} from "@/wab/client/components/live/preview-types";
import { observable, runInAction } from "mobx";
import React from "react";
import { Root, createRoot } from "react-dom/client";
import { createPreview } from "../../../../../../live-frame/src/preview";
import { createRenderer } from "../../../../../../live-frame/src/render";
import { createLiveRuntime } from "../../../../../../live-frame/src/runtime";

let container: HTMLDivElement;
let root: Root;
let frame: LiveFrame;
let runtime: ReturnType<typeof createLiveRuntime>;
const listeners = new Set<(error: Error) => void>();

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    listeners.forEach((listener) => listener(error));
  }
  render() {
    return this.state.error
      ? `Error: ${this.state.error.message}`
      : this.props.children;
  }
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  let renders = 0;
  const Sub = {
    React,
    DataProvider: ({ children }: React.PropsWithChildren<{}>) => children,
    hostUtils: {
      setPlasmicRootNode: (node: React.ReactNode) =>
        root.render(<ErrorBoundary key={++renders}>{node}</ErrorBoundary>),
      registerRenderErrorListener: (listener: (error: Error) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };
  const renderer = createRenderer(Sub);
  runtime = createLiveRuntime({
    react: React,
    "test-renderer": renderer,
    "@plasmicapp/react-web": {
      PlasmicDataSourceContextProvider: ({
        children,
      }: React.PropsWithChildren<{}>) => children,
    },
  });
  const preview = createPreview(Sub, runtime.require, renderer.renderRoot);
  frame = {
    ...preview,
    ...renderer,
    update: async (modules, spec) => {
      runtime.update(modules);
      if (spec) {
        await preview.render(spec);
      }
    },
  };
});
afterEach(() => {
  root.unmount();
  container.remove();
  listeners.clear();
  document
    .querySelectorAll("style[data-live-module]")
    .forEach((el) => el.remove());
});

const spec: PreviewRender = {
  root: "./root.tsx",
  isPage: true,
  depCss: [],
  propsModule: "./props.ts",
  globalVariants: [],
  globals: {},
  appUser: {},
};
const update = (
  source = 'import React from "react"; export default () => <h1>Fresh preview</h1>',
): PreviewUpdate => ({
  modules: [
    { name: "./root.tsx", lang: "tsx", source },
    { name: "./props.ts", lang: "ts", source: "export default {}" },
  ],
  render: spec,
});
function deliver(value: PreviewUpdate) {
  return new Promise<{ error?: unknown; text: string }>((resolve) => {
    const dispose = syncPreview(
      { __plasmicLive: frame } as unknown as Window,
      () => value,
      (error) => {
        resolve({ error, text: container.textContent ?? "" });
        dispose();
      },
    );
  });
}

it("reports completion only after the live preview commits", async () => {
  expect(await deliver(update())).toEqual({
    error: undefined,
    text: "Fresh preview",
  });
  expect(listeners.size).toBe(0);
});

it("waits for docs entry modules to commit before measuring their DOM", async () => {
  const result = await deliver({
    modules: [
      {
        name: "./docs.tsx",
        lang: "tsx",
        source: `
    import React from "react";
    import { renderRoot } from "test-renderer";
    export function __run() { return renderRoot(<h1>Docs preview</h1>); }
  `,
      },
    ],
    render: { run: "./docs.tsx" },
  });
  expect(result).toEqual({ error: undefined, text: "Docs preview" });
});

function preventRenderErrorReport(event: ErrorEvent) {
  // React reports a caught render error through jsdom before the boundary handles it.
  if (event.error?.message === "render failed") {
    event.preventDefault();
  }
}

it.each([
  ["syntax", "export default ("],
  [
    "evaluation",
    'throw new Error("evaluation failed"); export default () => null',
  ],
])(
  "replaces stale content after a %s error and recovers",
  async (_kind, source) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await deliver(update());
    const result = await deliver(update(source));
    expect(result.error).toBeDefined();
    expect(result.text).toContain("Failed to load the preview");
    expect(result.text).not.toContain("Fresh preview");
    expect(await deliver(update())).toEqual({
      error: undefined,
      text: "Fresh preview",
    });
    expect(listeners.size).toBe(0);
  },
);

it("leaves a render error to the host error boundary", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  window.addEventListener("error", preventRenderErrorReport);
  await deliver(update());
  expect(
    await deliver(
      update('export default () => { throw new Error("render failed"); }'),
    ),
  ).toEqual({ error: undefined, text: "Error: render failed" });
  expect(await deliver(update())).toEqual({
    error: undefined,
    text: "Fresh preview",
  });
  expect(listeners.size).toBe(0);
  window.removeEventListener("error", preventRenderErrorReport);
});

it("serializes commits and coalesces pending updates", async () => {
  const first = Promise.withResolvers<void>();
  const calls: string[] = [];
  const completed = Promise.withResolvers<void>();
  const fake = {
    ...frame,
    update: vi.fn(async (modules) => {
      calls.push(modules[0].source);
      if (calls.length === 1) {
        await first.promise;
      }
    }),
  };
  const css = (code: string): PreviewUpdate => ({
    modules: [{ name: "./test.css", lang: "css", source: code }],
  });
  const value = observable.box(css("first"), { deep: false });
  let done = 0;
  const dispose = syncPreview(
    { __plasmicLive: fake } as unknown as Window,
    () => value.get(),
    () => {
      if (++done === 2) {
        completed.resolve();
      }
    },
  );
  await vi.waitFor(() => expect(calls).toEqual(["first"]));
  runInAction(() => value.set(css("second")));
  runInAction(() => value.set(css("latest")));
  first.resolve();
  await completed.promise;
  expect(calls).toEqual(["first", "latest"]);
  dispose();
});

it("invalidates importers while preserving unrelated modules and CSS order", async () => {
  runtime.update([
    {
      fileName: "./a.js",
      code: 'exports.value=require("./b").value;',
      imports: [],
      type: "code",
    },
    { fileName: "./b.js", code: "exports.value=1;", imports: [], type: "code" },
    {
      fileName: "./unrelated.js",
      code: "exports.value={};",
      imports: [],
      type: "code",
    },
    { fileName: "./first.css", source: "div {color: red}", type: "asset" },
    { fileName: "./second.css", source: "div {color: blue}", type: "asset" },
  ]);
  expect(runtime.require("./a").value).toBe(1);
  const unrelated = runtime.require("./unrelated");
  runtime.require("./first.css");
  runtime.require("./second.css");
  const styles = [...document.querySelectorAll("style[data-live-module]")];
  runtime.update([
    { fileName: "./b.js", code: "exports.value=2;", imports: [], type: "code" },
    { fileName: "./first.css", source: "div {color: green}", type: "asset" },
  ]);
  expect(runtime.require("./a").value).toBe(2);
  expect(runtime.require("./unrelated")).toBe(unrelated);
  expect([...document.querySelectorAll("style[data-live-module]")]).toEqual(
    styles,
  );
  expect(styles[0].textContent).toContain("green");
  expect(() => runtime.require("missing-package")).toThrow(
    'unknown module "missing-package"',
  );
});

it("includes the JSX pragma in the transpilation cache key", async () => {
  const codes: string[] = [];
  const fake = {
    ...frame,
    update: vi.fn(async (modules) => {
      codes.push(modules[0].code);
    }),
  };
  const mod = {
    name: "./component.tsx",
    lang: "tsx",
    source: "export default <div />",
  };
  const value = observable.box<PreviewUpdate>(
    { modules: [mod] },
    { deep: false },
  );
  const dispose = syncPreview(
    { __plasmicLive: fake } as unknown as Window,
    () => value.get(),
    () => undefined,
  );
  await vi.waitFor(() => expect(codes).toHaveLength(1));
  runInAction(() =>
    value.set({
      modules: [{ ...mod, jsxPragma: "createPlasmicElementProxy" }],
    }),
  );
  await vi.waitFor(() => expect(codes).toHaveLength(2));
  expect(codes[0]).toContain("React.createElement");
  expect(codes[1]).toContain("createPlasmicElementProxy");
  dispose();
});

it("updates component and global variants without losing component state", async () => {
  const value =
    update(`import React from "react"; import { Theme } from "./theme";
    export default function Counter(props) {
      const [count, setCount] = React.useState(0);
      const theme = React.useContext(Theme);
      return <button onClick={() => setCount(count + 1)}>{count}/{props.variant}/{theme}</button>;
    }`);
  value.modules.push({
    name: "./theme.tsx",
    lang: "tsx",
    source:
      'import React from "react"; export const Theme=React.createContext("light"); export const Provider=Theme.Provider;',
  });
  value.render = {
    ...spec,
    globalVariants: [
      { module: "./theme.tsx", provider: "Provider", prop: "theme" },
    ],
    globals: { theme: "light" },
  };
  await deliver(value);
  container.querySelector("button")?.click();
  await vi.waitFor(() => expect(container.textContent).toBe("1//light"));
  frame.setProps({ variant: "active" });
  frame.setGlobals({ theme: "dark" });
  await vi.waitFor(() => expect(container.textContent).toBe("1/active/dark"));
});

it("commits a Suspense fallback without blocking the render queue", async () => {
  const result = await deliver(
    update("export default function Pending(){throw new Promise(() => {});}"),
  );
  expect(result).toEqual({ error: undefined, text: "Loading..." });
  expect(await deliver(update())).toEqual({
    error: undefined,
    text: "Fresh preview",
  });
});

it("commits an escaped 404 and recovers to a component", async () => {
  const result = await deliver({
    modules: [],
    render: { notFound: "/<script>bad()</script>" },
  });
  expect(result.error).toBeUndefined();
  expect(container.querySelector("tt")?.textContent).toBe(
    "/<script>bad()</script>",
  );
  expect(container.querySelector("script")).toBeNull();
  expect(await deliver(update())).toEqual({
    error: undefined,
    text: "Fresh preview",
  });
});

it("does not deliver pending updates after disposal", async () => {
  const fake = { ...frame, update: vi.fn(), showError: vi.fn() };
  const onDone = vi.fn();
  const dispose = syncPreview(
    { __plasmicLive: fake } as unknown as Window,
    () => update(),
    onDone,
  );
  dispose();
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(fake.update).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
});
