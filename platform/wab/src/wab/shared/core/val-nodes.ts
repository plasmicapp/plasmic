import type { Fiber } from "@/wab/client/react-global-hook/fiber";
import { isBaseVariant } from "@/wab/shared/Variants";
import {
  arrayEq,
  assert,
  ensure,
  ensureInstance,
  filterFalsy,
  insertMaps,
  shallowEq,
  switchType,
  switchTypeUnsafe,
  tuple,
} from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { SQ, SelQuery, Selectable } from "@/wab/shared/core/selection";
import { SlotSelection } from "@/wab/shared/core/slots";
import {
  classNameToRuleSetUid,
  createRuleSetMerger,
  expandRuleSets,
} from "@/wab/shared/core/styles";
import { TplTagType, TplTextTag, ancestors } from "@/wab/shared/core/tpls";
import { CanvasEnv } from "@/wab/shared/eval";
import { SlotInfo, ValState } from "@/wab/shared/eval/val-state";
import mobx from "@/wab/shared/import-mobx";
import { makeLayoutAwareRuleSet } from "@/wab/shared/layoututils";
import {
  Param,
  RichText,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
} from "@/wab/shared/model/classes";
import L, { uniq } from "lodash";
import type React from "react";

// Remove `readonly` modifier so the global hook can update the node's children.
// Should only be called when updating the React tree nodes.
export const writeableValNode = <T extends ValNode>(
  v: T
): { -readonly [P in keyof T]: T[P] } => v;

export interface ValNodeParams {
  tpl: TplNode;
  valOwner: ValComponent | null | undefined;
  key: string;
  fullKey: string;
  frameUid: number;
  fibers: Fiber[];
  parent: ValNode | undefined;
  className: string | undefined;
  slotInfo: SlotInfo | undefined;
}
export abstract class ValNode {
  static modelTypeName = "ValNode";
  private readonly _envs = mobx.observable.box<{
    env: CanvasEnv;
    wrappingEnv: CanvasEnv;
  }>(undefined, { deep: false });
  constructor(args: ValNodeParams) {
    Object.assign(this, args);
  }
  set envs(envs: { env: CanvasEnv; wrappingEnv: CanvasEnv }) {
    this._envs.set(envs);
  }
  get env() {
    return this._envs.get()?.env;
  }
  get wrappingEnv() {
    return this._envs.get()?.wrappingEnv;
  }
  private copyFrom(other: ValNode, { merge }: { merge: boolean }) {
    assert(
      !this.fullKey || this.fullKey === other.fullKey,
      () =>
        `Expected fullKeys to match, but got: ${this.fullKey} and ${other.fullKey}`
    );
    const writeableThis = writeableValNode(this);
    writeableThis.tpl = other.tpl;
    writeableThis.valOwner = other.valOwner;
    writeableThis.key = other.key;
    writeableThis.frameUid = other.frameUid;
    writeableThis.className = other.className;
    if (merge) {
      writeableThis.fibers = uniq([...this.fibers, ...other.fibers]);
    } else {
      writeableThis.fibers = [...other.fibers];
    }
    writeableThis.parent = other.parent ?? writeableThis.parent;
    writeableThis.slotInfo = other.slotInfo ?? writeableThis.slotInfo;
    if (this.env !== other.env || this.wrappingEnv !== other.wrappingEnv) {
      if (other.env && other.wrappingEnv) {
        this.envs = { env: other.env, wrappingEnv: other.wrappingEnv };
      }
    }
  }

  merge(other: ValNode) {
    this.copyFrom(other, { merge: true });
  }

  copy(other: ValNode) {
    this.copyFrom(other, { merge: false });
  }

  declare readonly tpl: TplNode;
  declare readonly valOwner: ValComponent | null | undefined;
  declare readonly key: string;
  declare readonly fullKey: string;
  declare readonly frameUid: number;
  declare readonly className: string | undefined; // Plasmic className
  declare readonly fibers: Fiber[];
  declare readonly parent: ValNode | undefined;
  declare readonly slotInfo: SlotInfo | undefined;
}

export interface ValTagParams extends ValNodeParams {
  tpl: TplTag;
  children: Array<ValNode>;
  className: string;
}
export class ValTag extends ValNode {
  static modelTypeName = "ValTag";
  constructor(args: ValTagParams) {
    super(args);
  }
  merge(other: ValTag) {
    super.merge(other);
    writeableValNode(this).children = [...other.children];
  }
  copy(other: ValTag) {
    super.copy(other);
    writeableValNode(this).children = [...other.children];
  }
  declare readonly tpl: TplTag;
  declare readonly children: Array<ValNode>;
  declare readonly className: string;
}

export enum ValidationType {
  Required,
  Custom,
}

export interface InvalidArgMeta {
  param: Param;
  validationType: ValidationType;
  message?: string;
}

export interface ValComponentParams extends ValNodeParams {
  tpl: TplComponent;
  slotArgs: Map<Param, ValNode[]>;
  className: string;
  slotCanvasEnvs: Map<Param, CanvasEnv>;
}
export class ValComponent extends ValNode {
  static modelTypeName = "ValComponent";

  // We store the props that this ValComponent code component was
  // instantiated with, to render custom component controls. We store
  // them in this observable box instead of reading from
  // fiber.memoizedProps because fiber.memoizedProps is not reactive;
  // since fiber.memoizedProps is only updated upon rendering, it
  // the ComponentActionsSection and ComponentPropsSection components
  // may have already finished rendering.
  private readonly _codeComponentProps = mobx.observable.box<
    Record<string, any> | undefined
  >(undefined, { deep: false });
  constructor(args: ValComponentParams) {
    super(args);
  }
  set codeComponentProps(props: any) {
    this._codeComponentProps.set(props);
  }
  get codeComponentProps() {
    return this._codeComponentProps.get();
  }

  // We also store the contents of a ValComponent in a reactive box.
  // That's because for code components, the contents may change
  // outside of the render tick -- for example, accessing $queries
  // may throw data-not-ready promise, leaving a contents array empty
  // until it is re-rendered. So we need to make sure when the contents
  // are filled up by globalHook, that the left tree will react and
  // re-render the proper content.  The _contents can also be `undefined`;
  // this signifies that the component has been rendered, but its contents
  // haven't been gathered yet. We use this information when we merge or
  // copy; we never merge `undefined` contents into defined contents.
  private readonly _contents = mobx.observable.box<ValNode[] | undefined>(
    undefined
  );
  set contents(vals: ValNode[] | undefined) {
    this._contents.set(vals);
  }
  get contents() {
    return this._contents.get();
  }

  merge(other: ValComponent) {
    super.merge(other);
    insertMaps(this.slotArgs, other.slotArgs);
    insertMaps(this.slotCanvasEnvs, other.slotCanvasEnvs);
    if (!shallowEq(this.codeComponentProps, other.codeComponentProps)) {
      this.codeComponentProps = other.codeComponentProps;
    }
    if (this.invalidArgs !== other.invalidArgs) {
      this.invalidArgs = other.invalidArgs;
    }
    if (other.contents != null) {
      if (!this.contents || !arrayEq(this.contents, other.contents)) {
        this.contents = [...other.contents];
      }
    }
  }

  copy(other: ValComponent) {
    super.copy(other);
    writeableValNode(this).slotArgs = new Map([...other.slotArgs.entries()]);
    writeableValNode(this).slotCanvasEnvs = new Map([
      ...other.slotCanvasEnvs.entries(),
    ]);
    if (!shallowEq(this.codeComponentProps, other.codeComponentProps)) {
      this.codeComponentProps = other.codeComponentProps;
    }
    if (this.invalidArgs !== other.invalidArgs) {
      this.invalidArgs = other.invalidArgs;
    }
    if (other.contents != null) {
      if (!this.contents || !arrayEq(this.contents, other.contents)) {
        this.contents = [...other.contents];
      }
    }
  }

  private _invalidArgs = mobx.observable.box<InvalidArgMeta[] | undefined>(
    undefined
  );
  get invalidArgs() {
    return this._invalidArgs.get();
  }
  set invalidArgs(params: InvalidArgMeta[] | undefined) {
    this._invalidArgs.set(params);
  }

  declare readonly tpl: TplComponent;
  declare readonly slotArgs: Map<Param, ValNode[]>;
  declare readonly className: string;
  // For components that provide data, we also store the DataCtx
  // results for each slot so the canvasEnv can have more accurate values
  declare readonly slotCanvasEnvs: Map<Param, CanvasEnv>;
}

export interface ValSlotParams extends ValNodeParams {
  tpl: TplSlot;
  contents: Array<ValNode> | null | undefined;
}
export class ValSlot extends ValNode {
  static modelTypeName = "ValSlot";
  constructor(args: ValSlotParams) {
    super(args);
  }
  merge(other: ValSlot) {
    super.merge(other);
    writeableValNode(this).contents = other.contents && [...other.contents];
  }
  copy(other: ValSlot) {
    super.copy(other);
    writeableValNode(this).contents = other.contents && [...other.contents];
  }
  declare readonly tpl: TplSlot;
  declare readonly contents: Array<ValNode> | null | undefined;
}

export interface ValTextParams extends ValTagParams {
  tpl: TplTextTag;

  // handle and text may be undefined if the text element wasn't successfully
  // rendered -- perhaps the content was data-bound to something invalid,
  // and a fallback boundary is rendered instead.
  handle?: {
    enterEdit: () => string | undefined;
    exitEdit: () => void;
  };
  text?: RichText | undefined;
}
export class ValTextTag extends ValTag {
  static modelTypeName = "ValTextTag";
  constructor(args: ValTextParams) {
    super(args);
  }
  merge(other: ValTextTag) {
    super.merge(other);
    writeableValNode(this).handle = other.handle;
    writeableValNode(this).text = other.text;
  }
  copy(other: ValTextTag) {
    super.copy(other);
    writeableValNode(this).handle = other.handle;
    writeableValNode(this).text = other.text;
  }
  declare readonly tpl: TplTextTag;
  declare readonly handle:
    | {
        enterEdit: () => string | undefined;
        exitEdit: () => void;
      }
    | undefined;
  declare readonly text: RichText | undefined;
}

export function cloneValNode<T extends ValNode>(valNode: T): T {
  const commonParams = {
    className: valNode.className,
    fibers: [...valNode.fibers],
    frameUid: valNode.frameUid,
    fullKey: valNode.fullKey,
    key: valNode.key,
    parent: valNode.parent,
    slotInfo: valNode.slotInfo,
    valOwner: valNode.valOwner,
  };
  const clone = switchTypeUnsafe(valNode)
    .when(ValComponent, (valComp) => {
      const clonedValComp = new ValComponent({
        ...commonParams,
        slotArgs: new Map([...valComp.slotArgs.entries()]),
        tpl: valComp.tpl,
        className: valComp.className,
        slotCanvasEnvs: new Map([...valComp.slotCanvasEnvs.entries()]),
      });
      clonedValComp.codeComponentProps = valComp.codeComponentProps;
      clonedValComp.contents = valComp.contents;
      return clonedValComp;
    })
    .when(
      ValSlot,
      (valSlot) =>
        new ValSlot({
          ...commonParams,
          contents: valSlot.contents && [...valSlot.contents],
          tpl: valSlot.tpl,
        })
    )
    .when(
      ValTextTag,
      (valText) =>
        new ValTextTag({
          ...commonParams,
          children: [...valText.children],
          className: valText.className,
          tpl: valText.tpl,
          handle: valText.handle,
          text: valText.text,
        })
    )
    .when(
      ValTag,
      (valTag) =>
        new ValTag({
          ...commonParams,
          children: [...valTag.children],
          className: valTag.className,
          tpl: valTag.tpl,
        })
    )
    .result();
  if (valNode.env && valNode.wrappingEnv) {
    clone.envs = { env: valNode.env, wrappingEnv: valNode.wrappingEnv };
  }
  return clone as any as T;
}

export function flattenVals(valTree: ValNode) {
  function* rec(val: ValNode): IterableIterator<ValNode> {
    yield val;
    for (const child of getValChildren(val)) {
      if (child instanceof ValNode) {
        yield* rec(child);
      } else if (isValComponent(val)) {
        for (const slotArg of val.slotArgs.get(child.slotParam) ?? []) {
          yield* rec(slotArg);
        }
      }
    }
  }
  return [...rec(valTree)];
}

/**
 * Includes SlotSelections
 */
export function getValComponentChildren(val: ValComponent) {
  if (!isCodeComponent(val.tpl.component)) {
    return val.contents ? [...val.contents] : [];
  } else {
    // TODO currently this is navigating among only the slot args that are defined.
    // this won't select slot placeholders.
    // really, want to navigate among slot placeholders too, but only the rendered ones and not all possible slots!
    return [...val.slotArgs.keys()].map(
      (slotParam) => new SlotSelection({ val, slotParam })
    );
  }
}

/** Includes SlotSelections */
export function getValChildren(val: ValNode): (ValNode | SlotSelection)[] {
  return switchTypeUnsafe(val)
    .when(ValTag, (valTag) => valTag.children)
    .when(ValSlot, (valSlot) => valSlot.contents?.map(slotContentValNode) || [])
    .when(ValComponent, (valComp: /*TWZ*/ ValComponent) =>
      getValComponentChildren(valComp)
    )
    .result();
}

export function isValNode(v: any): v is ValNode {
  return v instanceof ValNode;
}

/**
 * Returns true if the content of ValSlot is the default contents
 * Doesn't account for empty vals (e.g. conditional rendering, but still
 * corresponding to default content).
 */
export const slotHasDefaultContent = (slot: ValSlot) =>
  slot.contents &&
  slot.contents.length > 0 &&
  slot.contents.length === slot.tpl.defaultContents.length &&
  L.every(
    slot.contents.map(
      (v, i) => slotContentValNode(v).tpl === slot.tpl.defaultContents[i]
    )
  );

export function isSelectableValNode(valNode: ValNode) {
  return valNode instanceof ValNode;
}

/**
 * Given a TplNode, return a ValNode of that TplNode that is the best
 * ValNode to select, based on the current val path.
 *
 * The same component can show up multiple times in a component stack
 * (multiple frames).  So just specifying a TplNode to select is ambiguous
 * as to which of those multiple possible frames to make the selection in.
 * Hence we also require a frameNum (0 corresponds to the empty stack / no
 * frame).
 *
 * "Best" ValNode means trying to select something that tries to reuse as
 * much as possible any existing val path.  The only reason there are
 * possibly multiple options, besides the component stack, is because of
 * repeating elements.  So we are just deciding which repeated instances of
 * any TplNode to select.
 *
 * Anything that must veer off-path just selects the first val instance of
 * that tpl (first within what's scoped by the shared val path).
 *
 * The target frameNum must be a frame that is at or above the frame of
 * initialSel.  This is because if you specify a frame that is deeper, then
 * things become much harder:
 *
 * - The component that the target TplNode belongs to can be instantiated
 *   anywhere under the initialSel - there may be a big sub-tree to search.
 * - Even if we restrict the search to e.g. just one level deeper, we would
 *   need to search possibly many nodes within the upper stack frame.
 *
 * Our use cases also don't really require this functionality.  The TplTree
 * lets you click on elements in only this frame or above.  Inserting
 * elements is possible into only the current frame.  The only time we see
 * initialSel in a higher frame and target in a deeper frame is when we are
 * replacing a component root element with a new element and then targeting
 * that new element.  The old root element is no longer there, so the only
 * feasible initialSel is the ValComponent.  This situation only comes up
 * in extractComponent and wrap.  These are such specific cases that we
 * solve this outside this function, rather than implement a tree-walking
 * code path.
 */
function bestValForTplInternal(
  target: TplNode,
  frameNum: number,
  valState: ValState,
  initialSel: Selectable,
  tplUserRoot: TplNode
): ValNode | undefined {
  //
  // Select everything through the frame before frameNum.
  //

  const owners = SQ(initialSel, valState).owners().toArray().reverse();
  if (frameNum >= owners.length + 1) {
    return undefined;
  }

  //
  // We now want to focus on the val path within the target frame.  So the path
  // needs to be the ancestor path starting from the deepest node in that
  // frame, which is a ValComponent if the initial val were in a deeper
  // stack frame.  We call this the recurser.  There might not be one, if
  // initial val is not within any deeper frame (we're at the end of the
  // stack frame).
  //
  // The recurser should always be the owner right after the
  // targetFrameOwner.  This makes sense since these are the end and start
  // (respectively) of the target frame.
  //
  // Examples:
  //
  // owners == [], frameNum == 0 --> no recurser
  // owners == [C], frameNum == 1 --> targetFrame == C, no recurser
  // owners == [C], frameNum == 0 --> targetFrame == undefined, recurser is C
  // owners == [C,D,E], frameNum == 1 --> targetFrame == C, recurser is D
  //

  const targetFrameRecurser = owners[frameNum] || undefined;
  const sq = SQ(targetFrameRecurser || initialSel, valState);
  // Note that these paths are top-down.
  const valPath = sq.ancestors().toArray().reverse();
  const tplPath =
    frameNum === 0
      ? L.dropWhile(ancestors(target), (tpl) => tpl !== tplUserRoot)
      : ancestors(target);

  //
  // Select everything until the val.tpl path no longer matches the tpl path.
  //

  let valIndex = 0;
  let tplIndex = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let nextValIndex = valIndex + 1;
    const nextTplIndex = tplIndex + 1;
    let val = valPath[nextValIndex];
    const tpl = tplPath[nextTplIndex];
    // Skip SlotSelections, which are not ValNodes / don't have a
    // matching TplNode.
    if (val instanceof SlotSelection) {
      nextValIndex += 1;
      val = valPath[nextValIndex];
    }
    if (!(val && tpl && val.tpl === tpl)) {
      break;
    }
    valIndex = nextValIndex;
    tplIndex = nextTplIndex;
  }
  if (
    !(
      valPath[valIndex] &&
      tplPath[tplIndex] &&
      valPath[valIndex].tpl === tplPath[tplIndex]
    )
  ) {
    return undefined;
  }

  //
  // Select first instances of all remaining tpls in the tpl path.
  //

  let s: SelQuery | undefined = SQ(valPath[valIndex], valState);
  for (const tpl of tplPath.slice(tplIndex + 1)) {
    // Again, skip SlotSelections, since we are trying to navigate by
    // TplNodes.
    const val = s
      .valChildren()
      .toArray()
      .find((c) => c.tpl === tpl);
    if (!val) {
      s = undefined;
      break;
    }
    s = SQ(val, valState);
  }
  return s ? ensureInstance(s.get(), ValNode) : undefined;
}

export function bestValForTpl(
  target: TplNode | SlotSelection,
  frameNum: number,
  valState: ValState,
  initialSel: Selectable,
  tplUserRoot: TplNode
): Selectable | undefined {
  return switchType(target)
    .when(TplNode, (tpl) =>
      bestValForTplInternal(tpl, frameNum, valState, initialSel, tplUserRoot)
    )
    .when(SlotSelection, (selection) => {
      const val = bestValForTplInternal(
        ensure(selection.tpl, "Unexpected nuulish tpl node"),
        frameNum,
        valState,
        initialSel,
        tplUserRoot
      );
      if (!val) {
        // The SlotSelection is not evaluated because it is hidden
        return undefined;
      }
      return new SlotSelection({
        slotParam: selection.slotParam,
        val: ensureInstance(val, ValComponent),
      });
    })
    .result();
}

export function isScrollableVal(val: ValTag) {
  return getComputedStyleForVal(val).get("overflow") === "auto";
}

export function getValTagForValNode(val: ValTag | ValComponent): ValTag {
  return val instanceof ValTag
    ? val
    : getValTagForValNode(
        ensureInstance(val.contents?.[0], ValTag, ValComponent)
      );
}

export function isValText(val: ValNode) {
  if (!(val instanceof ValTag)) {
    return false;
  }
  return val.tpl.type === TplTagType.Text;
}

export function isValImage(val: ValNode) {
  if (!(val instanceof ValTag)) {
    return false;
  }
  return val.tpl.type === TplTagType.Image;
}

export function getComputedStyleForVal(val: ValTag | ValComponent) {
  const classes = val.className.split(/\s+/);
  const ruleSetUidMap = Object.fromEntries(
    val.tpl.vsettings.map((vs) => tuple(vs.rs.uid, vs))
  );
  // Find the applied rulesets *of the rulesets on this tpl*. Basically, for
  // TplComponents, they have their own rulesets, and their wrapped TplTag (or
  // TplComponent) has *their* own rulesets.  We return only the rulesets for the
  // requested TplComponent.
  const rulesets = filterFalsy(
    classes?.map((cls) => {
      if (cls.startsWith("uid-")) {
        const vs = ruleSetUidMap[classNameToRuleSetUid(cls)];
        if (vs) {
          return makeLayoutAwareRuleSet(vs.rs, isBaseVariant(vs.variants));
        }
      }
      return undefined;
    }) ?? []
  );
  const expandedRuleSets = expandRuleSets(rulesets);
  return createRuleSetMerger(expandedRuleSets, val.tpl);
}

export function isValTagOrComponent(val: any): val is ValTag | ValComponent {
  return val instanceof ValTag || val instanceof ValComponent;
}

export function isValTag(val: any): val is ValTag {
  return val instanceof ValTag;
}

export function isValComponent(val: any): val is ValComponent {
  return val instanceof ValComponent;
}

export function isValSlot(val: any): val is ValSlot {
  return val instanceof ValSlot;
}

export function representsSameValNode(val1: ValNode, val2: ValNode) {
  if (val1 instanceof ValNode && val2 instanceof ValNode) {
    return val1.key === val2.key;
  } else {
    return val1 === val2;
  }
}

/**
 * Returns contents of the argument `ValNode` that participates in layout
 */
export function getLayoutContents(val: ValNode): ValNode[] {
  if (val instanceof ValSlot) {
    // ValSlot and ValGroup don't map to actual DOM elements and so don't
    // participate in layout.  Return their children instead.
    const contents = (val.contents || []).map(slotContentValNode);
    return contents.flatMap((c) => getLayoutContents(c));
  } else {
    return [val];
  }
}

export function slotContentValNode(child: ValNode) {
  return child;
}

export function slotContentValNodeOrReactElement(
  child: ValNode | React.ReactElement
) {
  return child;
}
