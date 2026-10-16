import type {
  AssetModule,
  CodeModule,
  LiveFrame,
  PreviewUpdate,
  SourceModule,
} from "@/wab/client/components/live/preview-types";
import { safeCallbackify } from "@/wab/commons/control";
import { ensure, spawn } from "@/wab/shared/common";
import type { WindowWithLiveFrame } from "@/wab/shared/live-frame-types";
import * as asynclib from "async";
import { IAutorunOptions, autorun } from "mobx";

export function syncPreview(
  win: Window,
  build: () => PreviewUpdate | undefined,
  onDone: (error?: unknown) => void,
  options?: IAutorunOptions,
) {
  const queue = makeRenderQueue(win, onDone);
  const dispose = autorun(() => {
    const update = build();
    if (update) {
      queue.push(update);
    }
  }, options);
  return () => {
    dispose();
    queue.dispose();
  };
}

export function liveFrame(win: Window): LiveFrame {
  return ensure(
    (win as WindowWithLiveFrame).__plasmicLive,
    "window.__plasmicLive",
  );
}

function createTranspiler() {
  const cache = new Map<
    string,
    { source: string; jsxPragma?: string; code: string }
  >();
  return async (mod: SourceModule): Promise<CodeModule | AssetModule> => {
    if (mod.lang === "css") {
      return { fileName: mod.name, source: mod.source, type: "asset" };
    }
    let entry = cache.get(mod.name);
    if (
      !entry ||
      entry.source !== mod.source ||
      entry.jsxPragma !== mod.jsxPragma
    ) {
      const { transform } = await import("sucrase");
      const { code } = transform(mod.source, {
        transforms: ["typescript", "jsx", "imports"],
        jsxPragma: mod.jsxPragma,
        production: true,
        disableESTransforms: true,
      });
      entry = { source: mod.source, jsxPragma: mod.jsxPragma, code };
      cache.set(mod.name, entry);
    }
    return { fileName: mod.name, code: entry.code, imports: [], type: "code" };
  };
}

function makeRenderQueue(win: Window, onDone: (error?: unknown) => void) {
  const transpile = createTranspiler();
  let disposed = false;
  // Cargo holds updates until the previous render commits, then delivers the latest
  const queue = asynclib.cargo(
    safeCallbackify(async (tasks: PreviewUpdate[]) => {
      try {
        const { modules, render } = ensure(
          tasks[tasks.length - 1],
          "cargo has tasks",
        );
        const compiled = await Promise.all(modules.map(transpile));
        if (!disposed) {
          await liveFrame(win).update(compiled, render);
        }
        if (!disposed) {
          onDone();
        }
      } catch (error) {
        if (!disposed) {
          // Compilation fails in Studio and evaluation in the frame. Both must
          // replace stale content with the same visible error.
          await liveFrame(win).showError(error);
        }
        if (!disposed) {
          onDone(error);
        }
      }
    }),
  );
  return {
    push: (update: PreviewUpdate) => {
      if (!disposed) {
        spawn(queue.push(update));
      }
    },
    dispose: () => {
      disposed = true;
      queue.kill();
    },
  };
}
