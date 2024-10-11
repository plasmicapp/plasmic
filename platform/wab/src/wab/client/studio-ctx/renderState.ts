import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { getRealClassNames } from "@/wab/client/components/canvas/styles-name";
import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { Fiber } from "@/wab/client/react-global-hook/fiber";
import { globalHookCtx } from "@/wab/client/react-global-hook/globalHook";
import {
  asArray,
  assert,
  ensureInstance,
  maybe,
  removeWhere,
  withoutNils,
  xSetDefault,
} from "@/wab/shared/common";
import { Selectable } from "@/wab/shared/core/selection";
import { SlotSelection, makeSlotSelectionKey } from "@/wab/shared/core/slots";
import {
  ValComponent,
  ValNode,
  ValSlot,
  cloneValNode,
} from "@/wab/shared/core/val-nodes";
import { TplNode } from "@/wab/shared/model/classes";
import $ from "jquery";
import { maxBy } from "lodash";

// We only export the `RenderState` as a type
class RenderStateImpl {
  constructor() {}

  private _tpl2valKeys = new WeakMap<TplNode, Set<string>>();
  private _valKey2fullKeys = new Map<string, Set<string>>();
  private _fullKey2vals = new Map<string, Set<ValNode>>();

  registerVal(val: ValNode) {
    const updateRegistry = () => {
      const valKeys = xSetDefault(this._tpl2valKeys, val.tpl, () => new Set());
      if (!valKeys.has(val.key)) {
        valKeys.add(val.key);
      }
      const fullKeys = xSetDefault(
        this._valKey2fullKeys,
        val.key,
        () => new Set()
      );
      if (!fullKeys.has(val.fullKey)) {
        fullKeys.add(val.fullKey);
      }
      const vals = xSetDefault(
        this._fullKey2vals,
        val.fullKey,
        () => new Set()
      );
      if (!vals.has(val)) {
        vals.add(val);
      }
    };
    updateRegistry();
    this.recomputeCachedVal(val.fullKey);
    return this.fullKey2val(val.fullKey);
  }

  unregisterVal(val: ValNode) {
    const updateRegistry = () => {
      const vals = this._fullKey2vals.get(val.fullKey);
      if (!vals) {
        return;
      }
      vals.delete(val);
      if (vals.size > 0) {
        return;
      }
      this._fullKey2vals.delete(val.fullKey);
      const fullKeys = this._valKey2fullKeys.get(val.key);
      if (!fullKeys) {
        return;
      }
      fullKeys.delete(val.fullKey);
      if (fullKeys.size > 0) {
        return;
      }
      this._valKey2fullKeys.delete(val.key);
      const valKeys = this._tpl2valKeys.get(val.tpl);
      if (!valKeys) {
        return;
      }
      valKeys.delete(val.key);
      if (valKeys.size > 0) {
        return;
      }
      this._tpl2valKeys.delete(val.tpl);
    };
    updateRegistry();
    this.recomputeCachedVal(val.fullKey);
  }

  private cachedValNodes = new Map<string, WeakRef<ValNode>>();

  unregisterFromKey(fullKey: string) {
    this.cachedValNodes.delete(fullKey);
    this._valKey2fullKeys.delete(fullKey);
    this._fullKey2vals.delete(fullKey);
  }

  recomputeCachedVal(fullKey: string): ValNode | undefined {
    const registeredValsSet = this._fullKey2vals.get(fullKey);
    if (!registeredValsSet || registeredValsSet.size === 0) {
      return undefined;
    }
    const registeredVals = Array.from(registeredValsSet);

    assert(
      registeredVals.every(
        (v) => v.constructor === registeredVals[0].constructor
      ),
      () =>
        `The same fullKey (${fullKey}) is used for different ValNode types: ${registeredVals
          .map((v) => v.constructor["modelTypeName"])
          .join(", ")}`
    );

    const mergedVal = cloneValNode(registeredVals[0]);
    registeredVals.forEach((val) => mergedVal.merge(val));

    let cachedValNode = this.cachedValNodes.get(fullKey)?.deref();

    if (!cachedValNode || cachedValNode.constructor !== mergedVal.constructor) {
      cachedValNode = mergedVal;
      this.cachedValNodes.set(fullKey, new WeakRef(cachedValNode));
    } else {
      cachedValNode.copy(mergedVal);
    }

    return cachedValNode;
  }

  private _slotPlaceholderKey2fullKeys = new Map<string, string[]>();
  private _fullSlotPlaceholderKey2fiber = new Map<string, Fiber>();

  registerSlotPlaceholder(
    slotPlaceholderKey: string,
    fullKey: string,
    fiber: Fiber
  ) {
    const fullKeys = xSetDefault(
      this._slotPlaceholderKey2fullKeys,
      slotPlaceholderKey,
      () => []
    );
    if (!fullKeys.includes(fullKey)) {
      fullKeys.push(fullKey);
    }
    this._fullSlotPlaceholderKey2fiber.set(fullKey, fiber);
  }

  unregisterSlotPlaceholder(
    slotPlaceholderKey: string,
    fullKey: string,
    fiber: Fiber
  ) {
    const existingFiber = this._fullSlotPlaceholderKey2fiber.get(fullKey);
    if (existingFiber !== fiber) {
      return;
    }
    this._fullSlotPlaceholderKey2fiber.delete(fullKey);
    const fullKeys = this._slotPlaceholderKey2fullKeys.get(slotPlaceholderKey);
    if (!fullKeys) {
      return;
    }
    removeWhere(fullKeys, (k) => k === fullKey);
    if (fullKeys.length > 0) {
      return;
    }
    this._slotPlaceholderKey2fullKeys.delete(slotPlaceholderKey);
  }

  sel2CloneKeys(sel: Selectable, anchorCloneKey: string | undefined): string[] {
    if (sel instanceof SlotSelection) {
      const valComp =
        sel.val ??
        maybe(this.tpl2bestVal(sel.getTpl(), anchorCloneKey), (val) =>
          ensureInstance(val, ValComponent)
        );
      if (!valComp) {
        return [];
      }
      return asArray(this._valKey2fullKeys.get(valComp.key)).map(
        (k) => `${k}~${sel.slotParam.uuid}`
      );
    } else {
      return asArray(this._valKey2fullKeys.get(sel.key));
    }
  }

  sel2clone(sel: Selectable, cloneKey: string): Selectable | undefined {
    if (sel instanceof SlotSelection) {
      const valComp = sel.val
        ? sel.val
        : maybe(this.tpl2bestVal(sel.getTpl(), cloneKey), (v) =>
            ensureInstance(v, ValComponent)
          );
      return new SlotSelection({
        val: valComp,
        slotParam: sel.slotParam,
      });
    } else {
      return this.fullKey2val(cloneKey) ?? undefined;
    }
  }

  sel2dom(
    sel: Selectable,
    cctx: CanvasCtx,
    anchorCloneKey?: string
  ): HTMLElement[] | null {
    const tryGetSlotPlaceholder = (valSel: SlotSelection) => {
      const slotSelectionKey = makeSlotSelectionKey(valSel);
      const bestPlaceholderKey = this.bestFullKeyForSlotPlaceholder(
        slotSelectionKey,
        anchorCloneKey ?? ""
      );
      const maybeFiber = bestPlaceholderKey
        ? this._fullSlotPlaceholderKey2fiber.get(bestPlaceholderKey)
        : undefined;
      const win = cctx.win();
      return maybeFiber
        ? withoutNils(
            [...getDomNodesFromFiber(maybeFiber, win, cctx.Sub, false)].filter(
              (v) =>
                v && !(v instanceof win.Text) && shouldAcceptAsMappedDomNode(v)
            ) as HTMLElement[]
          )
        : null;
    };
    if (sel instanceof SlotSelection) {
      const valComp = sel.val
        ? sel.val
        : maybe(this.tpl2bestVal(sel.getTpl(), anchorCloneKey), (v) =>
            ensureInstance(v, ValComponent)
          );
      if (!valComp) {
        return null;
      }
      // First try get arg contents
      const dom =
        maybe(valComp.slotArgs.get(sel.slotParam), (vs) =>
          withoutNils(vs.map((v) => this.val2dom(v, cctx))).flat()
        ) ?? null;
      if (dom && dom.length > 0) {
        return dom;
      }
      // Try get a registered slot placeholder
      const valSel = !sel.val ? sel.withVal(valComp) : sel;
      return tryGetSlotPlaceholder(valSel);
    } else if (sel instanceof ValSlot) {
      // __wab_slot have display: contents, so we should get the children
      const dom = (sel.contents ?? []).flatMap((v) => this.val2dom(v, cctx));
      if (dom.length > 0) {
        return dom;
      }

      if (sel.valOwner) {
        // Check for placeholder
        return tryGetSlotPlaceholder(
          new SlotSelection({ val: sel.valOwner, slotParam: sel.tpl.param })
        );
      }
      return null;
    } else {
      return this.val2dom(sel, cctx);
    }
  }

  private val2dom(val: ValNode, cctx: CanvasCtx) {
    const win = cctx.win();
    const $doms = $(
      asArray(this._fullKey2vals.get(this.bestFullKeyForVal(val))).flatMap(
        ({ fibers }) =>
          withoutNils(
            fibers.flatMap((fiber) =>
              [...getDomNodesFromFiber(fiber, win, cctx.Sub, false)].filter(
                (v): v is HTMLElement =>
                  !!v &&
                  !(v instanceof win.Text) &&
                  shouldAcceptAsMappedDomNode(v)
              )
            )
          )
      )
    );
    if (val.className != null) {
      const selector = getRealClassNames(val.className)
        .map((cls) => `.${cls}`)
        .join("");
      if (!$doms.is(selector)) {
        const $found = $doms.find(selector);
        if ($found.length > 0) {
          return $found.get();
        }
      }
    }
    return $doms.get();
  }

  fullKey2val(fullKey: string): ValNode | undefined {
    const registeredVals = this._fullKey2vals.get(fullKey);
    const cachedVal = this.cachedValNodes.get(fullKey)?.deref();
    if (cachedVal && registeredVals && registeredVals.size > 0) {
      return cachedVal;
    }
    return undefined;
  }

  tpl2fullKeys(tpl: TplNode): string[] {
    return asArray(this._tpl2valKeys.get(tpl)).flatMap((valKey) =>
      asArray(this._valKey2fullKeys.get(valKey))
    );
  }

  tpl2bestVal(
    tpl: TplNode,
    anchorCloneKey: string | undefined
  ): ValNode | undefined {
    const allFullKeys = this.tpl2fullKeys(tpl);
    const fullKey = getBestFullKey(allFullKeys, anchorCloneKey);
    return fullKey ? this.fullKey2val(fullKey) : undefined;
  }

  tryGetUpdatedVal<T extends ValNode>(staleVal: T): T | undefined {
    const maybeVal = this.fullKey2val(this.bestFullKeyForVal(staleVal));
    if (maybeVal) {
      return maybeVal as T;
    }
    return undefined;
  }

  bestFullKeyForVal(val: ValNode): string {
    return val.fullKey;
  }

  bestFullKeyForSlotPlaceholder(
    slotPlaceholderKey: string,
    anchorCloneKey: string | undefined
  ): string | undefined {
    const fullKeys =
      this._slotPlaceholderKey2fullKeys.get(slotPlaceholderKey) ?? [];
    const splitFullKeys = fullKeys.map((k) => k.split("~"));
    const bestValCompFullKey = getBestFullKey(
      splitFullKeys.map((x) => x[0]),
      anchorCloneKey?.split("~")[0]
    );
    if (bestValCompFullKey) {
      const bestParamKey = splitFullKeys.find(
        ([k, p]) => k === bestValCompFullKey
      )?.[1];
      if (bestParamKey) {
        return `${bestValCompFullKey}~${bestParamKey}`;
      }
    }
    return undefined;
  }

  dispose() {
    this._tpl2valKeys = new WeakMap();
    this._fullKey2vals.clear();
    this._fullSlotPlaceholderKey2fiber.clear();
    this._slotPlaceholderKey2fullKeys.clear();
    this._valKey2fullKeys.clear();
  }
}

/**
 * @param fullKeys List of full keys for a Selectable
 * @param anchorCloneKey The "currently-selected" clone key. If there
 *   are multiple repeated branches, we will select the full key that
 *   is "along" this anchorCloneKey branch as much as possible. This
 *   anchorCloneKey can be deeper or shallower than the argument
 *   fullKeys.
 */
function getBestFullKey(
  fullKeys: string[],
  anchorCloneKey: string | undefined
): string | undefined {
  if (fullKeys.length === 0) {
    return undefined;
  }
  if (anchorCloneKey == null) {
    return fullKeys.sort()[0];
  }

  if (fullKeys.includes(anchorCloneKey)) {
    return anchorCloneKey;
  }

  const anchorParts = anchorCloneKey.split(".");

  const numMatchingParts = (fullKey: string) => {
    const parts = fullKey.split(".");
    for (let i = 0; i < parts.length; i++) {
      if (i >= anchorParts.length) {
        // We've run out of anchorParts!
        return i;
      } else if (parts[i] !== anchorParts[i]) {
        // Found a mismatch
        return i;
      }
    }
    // Matched all of parts
    return parts.length;
  };

  return maxBy(fullKeys, (key) => numMatchingParts(key));
}

export type RenderState = RenderStateImpl;

export function getRenderState(frameUid: number): RenderState {
  return xSetDefault(
    globalHookCtx.frameUidToRenderState,
    frameUid,
    () => new RenderStateImpl()
  );
}

// Traverses the fiber tree starting from `fiber` to gather the DOM nodes it
// renders to.
function* getDomNodesFromFiber(
  fiber: Fiber,
  win: typeof window,
  sub: SubDeps,
  visitSiblings = true
): Generator<HTMLElement | Text | null> {
  if (
    fiber.stateNode != null &&
    (fiber.stateNode instanceof win.HTMLElement ||
      fiber.stateNode instanceof win.Text)
  ) {
    yield fiber.stateNode;
  } else if (fiber.child) {
    // function component
    yield* getDomNodesFromFiber(fiber.child, win, sub);
  }

  if (visitSiblings && fiber.sibling) {
    yield* getDomNodesFromFiber(fiber.sibling, win, sub);
  }
}

/**
 * Returns true if the argument `element` can be used as a DOM element
 * mapped from val nodes. Gives us an opportunity to filter out DOM elements
 * that we don't want considered in the HoverBox boundary, etc.
 */
function shouldAcceptAsMappedDomNode(element: HTMLElement) {
  if (!element.isConnected) {
    return false;
  }
  if (element.hidden) {
    // react-aria also renders hidden elements as markers for start/end of
    // FocusScope
    return false;
  }
  if (element.style.clip === "rect(0px, 0px, 0px, 0px)") {
    // react-aria <HiddenSelect/>, etc, which is rendered for accesssibility
    // but is absolutely positioned
    return false;
  }
  return true;
}
