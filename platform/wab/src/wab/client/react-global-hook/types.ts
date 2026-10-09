import { Fiber, FiberRoot } from "@/wab/client/react-global-hook/fiber";
import { RenderState } from "@/wab/client/studio-ctx/renderState";
import { SlotSelection } from "@/wab/shared/core/slots";
import { ValComponent, ValNode } from "@/wab/shared/core/val-nodes";
import { CanvasEnv } from "@/wab/shared/eval";
import { TplNode } from "@/wab/shared/model/classes";
import { IObservableValue, ObservableMap } from "mobx";

export interface GlobalHookCtx {
  uuidToTplNode: Map<string, WeakRef<TplNode>>;
  valKeyToOwnerKey: Map<string, string | undefined>;
  fiberToVal: WeakMap<Fiber, ValNode | undefined>;
  fiberToSlotPlaceholderKeys: WeakMap<Fiber, SlotPlaceholderData | undefined>;
  envIdToEnvs: Map<string, WeakRef<{ env: CanvasEnv; wrappingEnv: CanvasEnv }>>;
  fullKeyToEnvId: Map<string, string>;
  frames: Map<number, FrameState>;
  createFrameState: (frame: {
    uid: number;
    objectPrototype: object;
  }) => FrameState;
  dispose: () => void;
}

/** Frame state that lives on the global hook. */
export interface FrameState {
  readonly uid: number;
  readonly renderState: RenderState;
  /** The frame's root ValComponent, set by the hook on each commit. */
  readonly valRoot: IObservableValue<ValComponent | null>;
  /** Context data set by the frame's code components, by val key. */
  readonly contextData: ObservableMap<string, any>;
  /** Dispose frame state so the frame can be freed from memory. */
  dispose: () => void;
}

export type UpdateableVal<T extends ValNode = ValNode> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * We support multiple fibers (from different subtrees) for the same ValNode.
 * To make that work, we store a list of ValNodes that are created for each
 * of those fibers (the non-cached nodes). Those are managed by `RenderState`
 * and only created / used by the global hook.
 *
 * From those non-cached versions, we compute a cached `ValNode` (it's cached so
 * that it's stable). This cached version is always computed by merging the data
 * in each of the non-cached versions, therefore it should never be mutated
 * directly. We can, instead, modify the non-cached version and call
 * `renderState.recomputeCachedVal` so the cached version gets updated.
 * For that reason, only `nonCached` is `UpdateableVal`.
 */
export type SlotArgsData = Record<
  string /* Param uuid */,
  { cached: ValNode; nonCached: UpdateableVal }[]
>;

export type SlotPlaceholderData = {
  frameUid: number;
  key: string;
  fullKey: string;
  toSlotSelection: () => SlotSelection | undefined;
};

/**
 * For components that provide data, we support getting the `CanvasEnv` with
 * the provided data for each slot. First, the DataCtxReader wraps the slot
 * contents in canvas-rendering with a dummy component, and provides the updated
 * env as a prop to that wrapper.
 *
 * Then the global hook consumes that env and stores it for each slot of the
 * `ValComponent`.
 */
export type SlotCanvasEnv = Record<string /* Param uuid */, CanvasEnv>;

export interface GlobalHook {
  plasmic: GlobalHookCtx;
  renderers?: Map<number, unknown>;
  inject: (injected: any) => number | undefined;
  onCommitFiberRoot: (
    rendererID: any,
    fiberRoot: FiberRoot,
    ...otherArgs: any[]
  ) => void;
  onCommitFiberUnmount: (
    rendererID: any,
    node: Fiber,
    ...otherArgs: any[]
  ) => void;
}
