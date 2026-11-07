import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { DataPickerSupportedVariableType } from "@/wab/shared/data-picker/data-picker-types";
import { Pt } from "@/wab/shared/geom";
import * as React from "react";

/** Captured at drag start from a data picker row. */
export interface DataDragPayload {
  path: (string | number)[];
  label: string;
  /** Current runtime value, for typing and expr fallbacks. */
  value: any;
  varType: DataPickerSupportedVariableType;
  previewValue?: string;
  sourceViewCtx: ViewCtx;
  /** Root keys of the env the drag started from, for repeat-var dedup. */
  envKeys: string[];
}

export type DataDropAcceptance = true | string;

export interface DataDropTargetHandlers {
  accepts: (payload: DataDragPayload) => DataDropAcceptance;
  onDropData: (payload: DataDragPayload, dropPt: Pt) => void;
}

interface DataDropHoverState {
  isDragging: boolean;
  isHovered: boolean;
  acceptance?: DataDropAcceptance;
}

interface RegisteredDataDropTarget extends DataDropTargetHandlers {
  getElement: () => HTMLElement | null;
  setHoverState: (state: DataDropHoverState) => void;
}

class DataDropTargetRegistry {
  private targets = new Set<RegisteredDataDropTarget>();
  private hoveredTarget: RegisteredDataDropTarget | undefined;
  private activePayload: DataDragPayload | undefined;
  private bodyCursor: string | undefined;

  register(target: RegisteredDataDropTarget) {
    this.targets.add(target);
    if (this.activePayload) {
      target.setHoverState({
        isDragging: true,
        isHovered: false,
        acceptance: target.accepts(this.activePayload),
      });
    }
    return () => {
      if (this.hoveredTarget === target) {
        this.setHoveredTarget(undefined);
      }
      this.targets.delete(target);
    };
  }

  beginDrag(payload: DataDragPayload) {
    this.activePayload = payload;
    for (const target of this.targets) {
      target.setHoverState({
        isDragging: true,
        isHovered: target === this.hoveredTarget,
        acceptance: target.accepts(payload),
      });
    }
  }

  drag(payload: DataDragPayload, clientPt: Pt) {
    if (this.activePayload !== payload) {
      this.beginDrag(payload);
    }
    const target = this.findTarget(clientPt);
    this.setHoveredTarget(target, payload);
    return !!target;
  }

  drop(payload: DataDragPayload, dropPt: Pt) {
    const target = this.hoveredTarget;
    const acceptance = target?.accepts(payload);
    this.endDrag();
    if (
      !target ||
      !this.targets.has(target) ||
      !target.getElement()?.isConnected ||
      acceptance !== true
    ) {
      return false;
    }
    target.onDropData(payload, dropPt);
    target.getElement()?.focus({ preventScroll: true });
    return true;
  }

  clear() {
    this.endDrag();
  }

  clearHover() {
    this.setHoveredTarget(undefined);
  }

  private endDrag() {
    this.setHoveredTarget(undefined);
    this.activePayload = undefined;
    for (const target of this.targets) {
      target.setHoverState({ isDragging: false, isHovered: false });
    }
  }

  private findTarget(clientPt: Pt) {
    const candidates = Array.from(this.targets).filter((target) => {
      const element = target.getElement();
      if (!element?.isConnected) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return (
        clientPt.x >= rect.left &&
        clientPt.x <= rect.right &&
        clientPt.y >= rect.top &&
        clientPt.y <= rect.bottom
      );
    });
    if (candidates.length <= 1) {
      return candidates[0];
    }

    // Prefer the most specific target under the pointer when indicators nest.
    return candidates.sort((a, b) => {
      const aRect = a.getElement()?.getBoundingClientRect();
      const bRect = b.getElement()?.getBoundingClientRect();
      const aArea = aRect ? aRect.width * aRect.height : Infinity;
      const bArea = bRect ? bRect.width * bRect.height : Infinity;
      return aArea - bArea;
    })[0];
  }

  private setHoveredTarget(
    target: RegisteredDataDropTarget | undefined,
    payload?: DataDragPayload,
  ) {
    if (this.hoveredTarget && this.hoveredTarget !== target) {
      this.hoveredTarget.setHoverState({
        isDragging: !!this.activePayload,
        isHovered: false,
        acceptance: this.activePayload
          ? this.hoveredTarget.accepts(this.activePayload)
          : undefined,
      });
    }
    this.hoveredTarget = target;
    const acceptance = target && payload ? target.accepts(payload) : undefined;
    target?.setHoverState({
      isDragging: !!this.activePayload,
      isHovered: true,
      acceptance,
    });
    this.setNotAllowedCursor(typeof acceptance === "string");
  }

  private setNotAllowedCursor(notAllowed: boolean) {
    if (notAllowed) {
      if (this.bodyCursor === undefined) {
        this.bodyCursor = document.body.style.cursor;
      }
      document.body.style.cursor = "not-allowed";
    } else if (this.bodyCursor !== undefined) {
      document.body.style.cursor = this.bodyCursor;
      this.bodyCursor = undefined;
    }
  }
}

const studioRegistries = new WeakMap<StudioCtx, DataDropTargetRegistry>();

export function getDataDropTargetRegistry(studioCtx: StudioCtx) {
  let registry = studioRegistries.get(studioCtx);
  if (!registry) {
    registry = new DataDropTargetRegistry();
    studioRegistries.set(studioCtx, registry);
  }
  return registry;
}

export function useDataDropTarget({
  ref,
  handlers,
}: {
  ref: React.RefObject<HTMLElement | null>;
  handlers?: DataDropTargetHandlers;
}) {
  const studioCtx = useStudioCtx();
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;
  const enabled = !!handlers;
  const [hoverState, setHoverState] = React.useState<DataDropHoverState>({
    isDragging: false,
    isHovered: false,
  });

  React.useEffect(() => {
    if (!enabled) {
      setHoverState({ isDragging: false, isHovered: false });
      return;
    }
    return getDataDropTargetRegistry(studioCtx).register({
      getElement: () => ref.current,
      accepts: (payload) =>
        handlersRef.current?.accepts(payload) ??
        "This drop target is no longer available",
      onDropData: (payload, dropPt) =>
        handlersRef.current?.onDropData(payload, dropPt),
      setHoverState,
    });
  }, [studioCtx, ref, enabled]);

  return hoverState;
}

/** Roots that resolve per component, so a path from another component is never valid. */
export const COMPONENT_SCOPED_ROOTS = new Set([
  "$props",
  "$state",
  "$queries",
  "$q",
  "$globalActions",
  "$refs",
]);

// Roots whose bindings differ per component or provider, so the root alone isn't enough.
const KEYED_ROOTS = new Set(["$ctx", "$q", "$queries", "$state"]);

/** Accepts a payload that resolves in `env` (of `viewCtx`) and is one of `types`. */
export function acceptDataDrop(
  payload: DataDragPayload,
  env: Record<string, any> | undefined,
  viewCtx: ViewCtx,
  types: readonly DataPickerSupportedVariableType[],
  rejection: string,
): DataDropAcceptance {
  const pathAcceptance = canUseDataDragPath(payload, env, viewCtx);
  return pathAcceptance !== true
    ? pathAcceptance
    : types.includes(payload.varType) || rejection;
}

export function canUseDataDragPath(
  payload: DataDragPayload,
  env: Record<string, any> | undefined,
  viewCtx: ViewCtx | undefined,
): true | string {
  const [root, binding] = payload.path;
  return env &&
    typeof root === "string" &&
    root in env &&
    (!COMPONENT_SCOPED_ROOTS.has(root) ||
      !viewCtx ||
      viewCtx.currentComponent() ===
        payload.sourceViewCtx.currentComponent()) &&
    (!KEYED_ROOTS.has(root) ||
      binding === undefined ||
      (env[root] != null &&
        Object.prototype.hasOwnProperty.call(env[root], binding)))
    ? true
    : "This data is not available here";
}
