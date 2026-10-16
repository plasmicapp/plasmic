import type { PreviewRender } from "./preview";
import type { AssetModule, CodeModule } from "./runtime-types";

export type { AssetModule, CodeModule, PreviewRender };

/** `window.__plasmicLive`, the API that Studio calls in the frame. */
export interface LiveFrame {
  update(
    modules: (CodeModule | AssetModule)[],
    render?: PreviewRender,
  ): Promise<void>;
  renderRoot(node: unknown): Promise<void>;
  showError(error: unknown): Promise<void>;
  setProps(props: Record<string, unknown>): void;
  setGlobals(globals: Record<string, unknown>): void;
}

export type WindowWithLiveFrame = typeof window & { __plasmicLive: LiveFrame };
