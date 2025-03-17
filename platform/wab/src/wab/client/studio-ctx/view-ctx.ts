import { Adoptee, InsertionSpec } from "@/wab/client/Dnd";
import { RunFn } from "@/wab/client/components/canvas/CanvasText";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import "@/wab/client/components/canvas/slate";
import { ViewOps } from "@/wab/client/components/canvas/view-ops";
import { makeClientPinManager } from "@/wab/client/components/variants/ClientPinManager";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { DevCliSvrEvaluator } from "@/wab/client/cseval";
import { WithDbCtx } from "@/wab/client/db";
import { Fiber } from "@/wab/client/react-global-hook/fiber";
import {
  getMostRecentFiberVersion,
  globalHookCtx,
} from "@/wab/client/react-global-hook/globalHook";
import { mkFrameValKeyToContextDataKey } from "@/wab/client/react-global-hook/utils";
import { requestIdleCallbackAsync } from "@/wab/client/requestidlecallback";
import {
  FreestyleState,
  PointerState,
  StudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import { ComponentCtx } from "@/wab/client/studio-ctx/component-ctx";
import { trackEvent } from "@/wab/client/tracking";
import { ViewStateSnapshot } from "@/wab/client/undo-log";
import { drainQueue } from "@/wab/commons/asyncutil";
import { safeCallbackify } from "@/wab/commons/control";
import { getArenaFrames } from "@/wab/shared/Arenas";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { getAncestorSlotArg } from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { isBaseVariant } from "@/wab/shared/Variants";
import { FastBundler } from "@/wab/shared/bundler";
import {
  allCustomFunctions,
  getLinkedCodeProps,
} from "@/wab/shared/cached-selectors";
import { customFunctionId } from "@/wab/shared/code-components/code-components";
import {
  arrayEq,
  assert,
  ensure,
  ensureArray,
  ensureArrayOfInstances,
  ensureInstance,
  last,
  maybe,
  maybes,
  spawn,
  swallow,
  switchType,
  tuple,
  withoutNils,
} from "@/wab/shared/common";
import {
  ComponentVariantFrame,
  GlobalVariantFrame,
  RootComponentVariantFrame,
  TransientComponentVariantFrame,
} from "@/wab/shared/component-frame";
import {
  CodeComponent,
  isCodeComponent,
  isFrameComponent,
} from "@/wab/shared/core/components";
import { getRawCode } from "@/wab/shared/core/exprs";
import { metaSvc } from "@/wab/shared/core/metas";
import { SQ, Selectable } from "@/wab/shared/core/selection";
import { isTplAttachedToSite } from "@/wab/shared/core/sites";
import { SlotSelection, isSlotSelection } from "@/wab/shared/core/slots";
import {
  StateVariableType,
  getStateOnChangePropName,
  getStateValuePropName,
  getStateVarName,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import { RawTextLike } from "@/wab/shared/core/tpls";
import {
  ComponentEvalContext,
  ValComponent,
  ValNode,
  ValTag,
  ValTextTag,
  bestValForTpl,
} from "@/wab/shared/core/val-nodes";
import {
  asTpl,
  asVal,
  isValSelectable,
  tplFromSelectable,
} from "@/wab/shared/core/vals";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { CanvasEnv, evalCodeWithEnv } from "@/wab/shared/eval";
import { Pt, rectsIntersect } from "@/wab/shared/geom";
import {
  ArenaFrame,
  Component,
  CustomFunction,
  Param,
  RawText,
  RichText,
  State,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  VariantSetting,
  isKnownTplComponent,
} from "@/wab/shared/model/classes";
import { isTplResizable } from "@/wab/shared/sizingutils";
import {
  generateStateOnChangeProp,
  generateStateValueProp,
  useDollarState,
} from "@plasmicapp/react-web";
import asynclib from "async";
import $ from "jquery";
import L, { defer, groupBy, head, isEqual, sortBy } from "lodash";
import * as mobx from "mobx";
import { comparer, computed, observable } from "mobx";
import { computedFn } from "mobx-utils";
import * as React from "react";
import { CSSProperties } from "react";
import type { Editor as SlateEditor } from "slate";

export class ViewMode {
  static live: ViewMode;
  static dev: ViewMode;
}
ViewMode.live = new ViewMode();
ViewMode.dev = new ViewMode();

interface ViewCtxSyncArgs {
  styles?: boolean;
  eval?: boolean;
  asap?: boolean;
}

interface ViewCtxArgs {
  studioCtx: StudioCtx;
  viewportCtx: ViewportCtx;
  canvasCtx: CanvasCtx;
  arenaFrame: ArenaFrame;
}

export interface EditingTextContext {
  val: ValTextTag;
  targetVs: VariantSetting;
  draftText: RawText | RawTextLike | undefined;
  // The run() function is used to run commands in the rich text editor from
  // outside.
  run: RunFn | undefined;
  editor: SlateEditor | undefined;
}

/**
 * Useful information to decide whether or not the arenaFrame should re-render.
 */
export interface SpotlightAndVariantsInfo {
  componentStackFrameLength: number;
  lastComponentFrame: ComponentVariantFrame;
  viewMode: string;
  pinnedVariants: { [key: string]: boolean };
  showDefaultSlotContents: boolean;
  focusedSelectable: Selectable | undefined;
  focusedTpl: TplNode | undefined;
}

export class ViewCtx extends WithDbCtx {
  readonly studioCtx: StudioCtx;
  readonly viewportCtx: ViewportCtx;

  csEvaluator: DevCliSvrEvaluator;

  get isFirstRenderComplete() {
    return this.csEvaluator.isFirstRenderComplete;
  }

  get renderCount() {
    return this.csEvaluator.renderCount;
  }

  private disposals: (() => void)[] = [];
  private _isDisposed = false;
  private _editingTextResizeObserver: ResizeObserver | undefined;

  private _nextFocusedTpl: TplNode | undefined;
  nextFocusedTpl() {
    return this._nextFocusedTpl;
  }

  private _highlightParam = observable.box<
    | {
        param: Param;
        tpl: TplComponent;
      }
    | undefined
  >(undefined);
  get highlightParam() {
    return this._highlightParam.get();
  }
  set highlightParam(val: { param: Param; tpl: TplComponent } | undefined) {
    this._highlightParam.set(val);
  }

  _triggerEditingTextDataPicker = observable.box<boolean | null>(null);
  _editingTextContext = observable.box<EditingTextContext | null>(null);

  private _xFocusedDomElts = observable.box<(JQuery | null)[]>([], {
    name: "ViewCtx.focusedDomElts",
  });
  private get _focusedDomElts() {
    return this._xFocusedDomElts.get();
  }
  private set _focusedDomElts(domElt: (JQuery | null)[]) {
    const curRealElt = this._xFocusedDomElts.get();
    const newRealElt = domElt;
    if (curRealElt.length !== newRealElt.length) {
      this._xFocusedDomElts.set(domElt);
      return;
    }
    for (let i = 0; i < curRealElt.length; i++) {
      const a = curRealElt[i];
      const b = newRealElt[i];
      if (!!a !== !!b) {
        this._xFocusedDomElts.set(domElt);
        return;
      }
      if (a && b && !arrayEq(a.get(), b.get())) {
        this._xFocusedDomElts.set(domElt);
        return;
      }
    }
  }

  private _$hoveredDomElt = observable.box<JQuery | null | undefined>(null, {
    name: "ViewCtx.hoveredDomElt",
  });
  $hoveredDomElt() {
    return this._$hoveredDomElt.get();
  }
  private setHoveredDomElt($domElt: JQuery | null | undefined) {
    this._$hoveredDomElt.set($domElt);
  }

  private _hoveredSelectable = observable.box<Selectable | null | undefined>(
    null,
    {
      name: "ViewCtx.hoveredSelectable",
    }
  );
  hoveredSelectable() {
    return this._hoveredSelectable.get();
  }
  private setHoveredSelectable(selectable: Selectable | null | undefined) {
    this._hoveredSelectable.set(selectable);
  }

  private _xFocusedCloneKeys = observable.box<(string | undefined)[]>([], {
    name: "ViewCtx.focusedCloneKeys",
  });
  private get _focusedCloneKeys() {
    return this._xFocusedCloneKeys.get();
  }
  private set _focusedCloneKeys(cloneKeys: (string | undefined)[]) {
    if (!arrayEq(this._xFocusedCloneKeys.get(), cloneKeys)) {
      this._xFocusedCloneKeys.set(cloneKeys);
    }
  }
  /**
   * @deprecated Use {@link focusedCloneKeys} to handle multi-selection.
   */
  focusedCloneKey() {
    return head(this._focusedCloneKeys);
  }
  focusedCloneKeys() {
    return this._focusedCloneKeys;
  }

  private _$measureToolDomElt = observable.box<JQuery | null | undefined | Pt>(
    null,
    {
      name: "ViewCtx.measureToolDomElt",
    }
  );
  $measureToolDomElt() {
    return this._$measureToolDomElt.get();
  }
  setMeasureToolDomElt($domElt: JQuery | null | undefined | Pt) {
    this._$measureToolDomElt.set($domElt);
  }

  private _arenaFrame: ArenaFrame;

  arenaFrame() {
    return this._arenaFrame;
  }

  arenaFrameRoot() {
    return this.arenaFrame().container.component.tplTree;
  }

  private _codeComponentValKeyToContextData = observable.map<string, any>(
    undefined,
    {
      deep: false,
    }
  );

  getContextData(val: ValComponent) {
    if (!isCodeComponent(val.tpl.component)) {
      return null;
    }
    if (!this._codeComponentValKeyToContextData.has(val.key)) {
      this._codeComponentValKeyToContextData.set(val.key, null);
    }
    return this._codeComponentValKeyToContextData.get(val.key);
  }

  getContextDataByValKey(valKey: string) {
    return this._codeComponentValKeyToContextData.get(valKey);
  }

  createSetContextDataFn = computedFn((valKey: string) => {
    return (value: any) => {
      const oldValue = this._codeComponentValKeyToContextData.get(valKey);
      if (isEqual(oldValue, value)) {
        return;
      }
      globalHookCtx.frameValKeyToContextData.set(
        mkFrameValKeyToContextDataKey(this.arenaFrame().uid, valKey),
        value
      );
      this._codeComponentValKeyToContextData.set(valKey, value);
    };
  });

  pointerState() {
    return this.studioCtx.pointerState();
  }
  setPointerState(pointerState: PointerState) {
    return this.studioCtx.setPointerState(pointerState);
  }

  setFreestyleState(state: FreestyleState | undefined) {
    return this.studioCtx.setFreestyleState(state);
  }
  freestyleState() {
    return this.studioCtx.freestyleState();
  }

  // dnd state
  private _dndTentativeInsertion = observable.box<InsertionSpec | undefined>(
    undefined,
    { name: "ViewCtx.dndTentativeInsertion" }
  );
  getDndTentativeInsertion() {
    return this._dndTentativeInsertion.get();
  }
  setDndTentativeInsertion(ins?: InsertionSpec) {
    this._dndTentativeInsertion.set(ins);
  }

  refreshFetchedDataFromPlasmicQuery(invalidateKey?: string) {
    this.canvasCtx.refreshFetchedDataFromPlasmicQuery(invalidateKey);
  }

  private _dndDraggedNode = observable.box<ValTag | ValComponent | undefined>(
    undefined,
    { name: "ViewCtx.dndDraggedNode" }
  );
  getDndDraggedNode() {
    this._dndDraggedNode.get();
  }
  setDndDraggedNode(node?: ValTag | ValComponent) {
    this._dndDraggedNode.set(node);
  }

  // focusedTpl: TplNode | null;
  // focusedObject: SlotSelection | ValNode | null | undefined;
  private _xFocusedTpls = observable.box<(TplNode | null)[]>([], {
    name: "ViewCtx.focusedTpls",
  });
  get _focusedTpls() {
    return this._xFocusedTpls.get();
  }
  set _focusedTpls(tpls: (TplNode | null)[]) {
    const current = this._xFocusedTpls.get();
    if (!arrayEq(current, tpls)) {
      // switch away from the private variant, which belongs to the previous
      // tpl.
      const frame = this.currentComponentStackFrame();

      if (frame.hasPrivateVariants()) {
        this.change(() => frame.clearPrivateVariants());
      }

      this._xFocusedTpls.set(tpls);
    }
  }

  focusedTplAncestorsThroughComponents = computedFn(
    () => {
      const node = (() => {
        const selectables = withoutNils(this.focusedSelectables());
        if (selectables.length === 1) {
          const selectable = selectables[0];
          if (isSlotSelection(selectable)) {
            return selectable;
          } else {
            return selectable.tpl;
          }
        }
        const tpls = withoutNils(this.focusedTpls());
        if (tpls.length === 1) {
          return tpls[0];
        }
        return null;
      })();
      // Running `ancestorsThroughComponentsWithSlotSelections` every time focusedTpl changes may
      // be expensive, can we do better?
      return node
        ? Tpls.ancestorsThroughComponentsWithSlotSelections(node, {
            includeTplComponentRoot: true,
          })
        : [];
    },
    {
      name: "ViewCtx.focusedTplAncestorsThroughComponents",
      equals: comparer.structural,
    }
  );

  private _xFocusedSelectables = observable.box<(Selectable | null)[]>([], {
    name: "ViewCtx.focusedSelectables",
  });
  get _focusedSelectables(): (Selectable | null)[] {
    return this._xFocusedSelectables.get();
  }
  set _focusedSelectables(objs: (Selectable | null)[]) {
    const current = this._xFocusedSelectables.get();
    if (!arrayEq(objs, current)) {
      this._xFocusedSelectables.set(objs);
      this.tryBlurEditingText();
    }
  }
  private _xHighlightedAdoptees = observable.box<Adoptee[]>([], {
    name: "ViewCtx.highlightedAdoptees",
  });
  get _highlightedAdoptees() {
    return this._xHighlightedAdoptees.get();
  }
  set _highlightedAdoptees(adoptees: Adoptee[]) {
    this._xHighlightedAdoptees.set(adoptees);
  }

  private _xCurrentComponentCtx = observable.box<ComponentCtx | null>(null, {
    name: "ViewCtx.currentComponentCtx",
  });
  get _currentComponentCtx() {
    return this._xCurrentComponentCtx.get();
  }
  set _currentComponentCtx(ctx: ComponentCtx | null) {
    this._xCurrentComponentCtx.set(ctx);
  }

  private _xShowDefaultSlotContents = observable.box<boolean>(false, {
    name: "ViewCtx.showDefaultSlotContents",
  });
  get _showDefaultSlotContents() {
    return this._xShowDefaultSlotContents.get();
  }
  set _showDefaultSlotContents(show: boolean) {
    this._xShowDefaultSlotContents.set(show);
  }

  _viewState: { viewingCode?: boolean };
  canvasCtx: CanvasCtx;
  viewOps: ViewOps;
  _componentStackFrames = observable.array<ComponentVariantFrame>([]);

  getViewOps() {
    return ensure(this.viewOps, "Unexpected nullish viewOps");
  }

  get styleMgr() {
    return this.studioCtx.styleMgrBcast;
  }
  get styleChanged() {
    return this.studioCtx.styleChanged;
  }
  get clipboard() {
    return this.studioCtx.clipboard;
  }

  get component() {
    return this.arenaFrame().container.component;
  }

  dbCtx() {
    return this.studioCtx.dbCtx();
  }

  enforcePastingAsSibling = false;

  constructor(args: ViewCtxArgs) {
    super();

    mobx.makeObservable(this, {
      hasValState: computed,
      customFunctions: computed,
    });

    ({
      studioCtx: this.studioCtx,
      viewportCtx: this.viewportCtx,
      canvasCtx: this.canvasCtx,
      arenaFrame: this._arenaFrame,
    } = args);
    this.viewOps = new ViewOps({ viewCtx: this });
    this.csEvaluator = new DevCliSvrEvaluator({
      viewCtx: this,
    });
    this._componentStackFrames.replace([
      new RootComponentVariantFrame(this.arenaFrame()),
    ]);
    this._globalFrame.set(new GlobalVariantFrame(this.site, this.arenaFrame()));
    this.setEditingTextContext(null);
    this._focusedDomElts = [];
    this.setHoveredDomElt(null);
    this._focusedTpls = [];
    // Either ValNode or SlotSelection
    this._focusedSelectables = [];
    this.setHoveredSelectable(null);
    this._currentComponentCtx = null;
    this._viewState = {};

    // We pause and resume the syncQueue depending on whether we are
    // visible on the canvas
    this.disposals.push(
      mobx.reaction(
        () => !this.studioCtx.isTransforming() && this.isVisible(),
        (visible) => {
          if (visible) {
            this.syncQueue.resume();
          } else {
            this.syncQueue.pause();
          }
        },
        {
          fireImmediately: true,
        }
      ),
      mobx.reaction(
        () => this._focusedTpls,
        () => {
          // When selection changes, we can stop to enforce pasting as sibling,
          // unless the new selection is the new pasted node, but in that case
          // the "paste" method sets this flag after selecting the new node
          this.enforcePastingAsSibling = false;

          if (DEVFLAGS.ephemeralRecording && this._focusedTpls) {
            const vcontroller = makeVariantsController(this.studioCtx);
            if (
              vcontroller &&
              !isBaseVariant(vcontroller.getTargetedVariants())
            ) {
              this.change(() =>
                vcontroller.onToggleTargetingOfActiveVariants()
              );
            }
          }
        }
      )
    );
  }

  canvasObservers = new Set<mobx.Reaction>();

  /**
   * Disposes any mobx observers, and try to cut as many cyclic dependencies
   * as possible.
   *
   * TODO: it seems a disposed ViewCtx never really gets released from memory.
   * Still yet to figure out why; at last check, requestIdleCallback may be
   * holding on to an instance somehow?
   */
  dispose() {
    this.disposals.forEach((d) => d());
    this._editingTextResizeObserver?.disconnect();
    this.canvasObservers.forEach(
      (reaction) => !reaction.isDisposed && reaction.dispose()
    );
    this.canvasCtx.dispose();
    this.csEvaluator?.dispose();
    (this.csEvaluator as any) = null;
    this._isDisposed = true;
  }

  get isDisposed() {
    return this._isDisposed;
  }

  _globalFrame = observable.box<GlobalVariantFrame>(undefined, {
    name: "ViewCtx.globalFrame",
  });
  get globalFrame() {
    return ensure(this._globalFrame.get(), `globalFrame must already be set`);
  }

  private _isEditingNonBaseVariant = computed(() => {
    if (!this.valState().maybeValSysRoot()) {
      return false;
    }

    const component = this.currentComponent();

    if (isFrameComponent(component)) {
      return false;
    }

    const pinManager = makeClientPinManager(this);

    return !isBaseVariant(pinManager.selectedVariants());
  });

  get isEditingNonBaseVariant() {
    return this._isEditingNonBaseVariant.get();
  }

  valComponentStack() {
    const currentValComponent = maybe(this.currentComponentCtx(), (cc) =>
      cc.valComponent()
    );
    const owners =
      maybe(currentValComponent, (vc) => this.parentComponents(vc)) || [];
    const stack = [
      this.component ? this.valState().maybeValSysRoot() : undefined,
      ...owners.reverse(),
      currentValComponent,
    ].filter(Boolean);
    return ensureArrayOfInstances(stack, ValComponent);
  }

  tryBlurEditingText() {
    const ctx = this.editingTextContext();
    if (!ctx) {
      return;
    }

    this.change(() => {
      this.getViewOps().saveText();

      ctx.val.handle?.exitEdit();

      this.canvasCtx.clearRange();
      this.setEditingTextContext(null);

      // While rich-text editing, the focus will be on the frame. We reset
      // it to document.body when done.
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }
    });
  }

  /**
   * Set focus inside an ViewCtx by tpl.  You probably want setStudioFocusByTpl
   * instead, which also switches the studio to focus on this ViewCtx.
   */
  private setViewCtxFocusByTpl(
    x: TplNode | null,
    anchorCloneKey = this.focusedCloneKey(),
    opts: { appendToMultiSelection?: boolean; noRestoreRightTab?: boolean } = {}
  ) {
    opts.appendToMultiSelection =
      this.appCtx.appConfig.multiSelect && !!opts.appendToMultiSelection;

    mobx.runInAction(() => {
      if (x != null) {
        const [valNode, doms] = this.maybeDomsForTpl(x, {
          anchorCloneKey,
        });

        if (opts.appendToMultiSelection) {
          let maybeIdxToDelete: number | undefined = undefined;
          for (let idx = 0; idx < this._focusedSelectables.length; idx++) {
            if (
              x === this._focusedTpls[idx] &&
              (anchorCloneKey ?? null) === this._focusedCloneKeys[idx]
            ) {
              maybeIdxToDelete = idx;
            }
          }

          if (maybeIdxToDelete) {
            this._focusedTpls.splice(maybeIdxToDelete, 1);
            this._focusedSelectables.splice(maybeIdxToDelete, 1);
            this._focusedDomElts.splice(maybeIdxToDelete, 1);
            this._focusedCloneKeys.splice(maybeIdxToDelete, 1);
          } else {
            this._focusedTpls = [...this._focusedTpls, x];
            this._focusedSelectables = [...this._focusedSelectables, valNode];
            this._focusedDomElts = [
              ...this._focusedDomElts,
              doms ? $(doms) : null,
            ];
            this._focusedCloneKeys = [
              ...this._focusedCloneKeys,
              anchorCloneKey,
            ];
          }
        } else {
          const changed = this.focusedTpl() !== x;
          this._focusedTpls = [x];
          this._focusedSelectables = [valNode];
          this._focusedDomElts = [doms ? $(doms) : null];
          this._focusedCloneKeys = [anchorCloneKey];
          if (!opts.noRestoreRightTab && changed) {
            this.studioCtx.restoreLastElementTab();
          }
        }

        //if @_focusedDomElt?
        //  @_checkDomEltIsFocusable(@_focusedDomElt)
      } else if (!opts.appendToMultiSelection) {
        this._focusedDomElts = [];
        this._focusedSelectables = [];
        this._focusedTpls = [];
        this._focusedCloneKeys = [];
      }
    });
  }

  maybeDomsForTpl = (
    tpl: TplNode,
    opts: {
      anchorCloneKey?: string;
      ignoreFocusedCloneKey?: boolean;
    }
  ) => {
    const valNodes = this.maybeTpl2ValsInContext(tpl, opts);
    const valNode = valNodes.length > 0 ? valNodes[0] : null;
    return tuple(
      valNode,
      valNode
        ? this.renderState.sel2dom(valNode, this.canvasCtx, opts.anchorCloneKey)
        : null
    );
  };

  maybeTpl2ValsInContext(
    x: TplNode,
    opts?: {
      allowAnyContext?: boolean;
      anchorCloneKey?: string;
      ignoreFocusedCloneKey?: boolean;
    }
  ) {
    if (!this.valState().maybeValSysRoot()) {
      return [];
    }
    const vals = withoutNils([
      this.renderState.tpl2bestVal(
        x,
        opts?.anchorCloneKey ??
          (!opts?.ignoreFocusedCloneKey ? this.focusedCloneKey() : undefined)
      ),
    ]);
    if (!vals) {
      return [];
    }

    if (opts?.allowAnyContext) {
      return vals;
    }

    const curOwner = this.currentValComponent();
    return vals.filter((val) => val.valOwner?.key === curOwner.key);
  }

  get renderState() {
    return this.csEvaluator.renderState;
  }

  /**
   * This will auto-pop frames off the drill stack as necessary.  It thus
   * assumes the TplNode to select is one along the drill stack so far.  This
   * should be unique since we have no recursion, and the UI currently only
   * supports selecting TplNodes that are in one of the drill stack frames.
   */
  setStudioFocusByTpl(
    x: TplNode | null,
    anchorCloneKey = this.focusedCloneKey(),
    opts: { appendToMultiSelection?: boolean } = {}
  ) {
    this.popDrillForTpl(x);
    this.setViewCtxFocusByTpl(x, anchorCloneKey, opts);
    this.studioCtx.setStudioFocusOnViewCtxContent(this);
  }

  private popDrillForTpl(x: TplNode | null) {
    if (!x || !this.valState().maybeValSysRoot()) {
      this.setCurrentComponentCtx(null);
      return;
    }
    // Adjust component ctx for new Tpl focus.
    const c = $$$(x).owningComponent();
    const valFrames = this.valComponentStack();
    const targetValFrame = ensure(
      valFrames.find((f) => f.tpl.component === c),
      () =>
        `popDrillForTpl ${Tpls.summarizeTpl(
          x
        )}: There must be a component frame for owning component ${
          c.name
        }; current frames: [${valFrames
          .map((f) => f.tpl.component.name)
          .join(",")}]`
    );
    if (targetValFrame === valFrames[0]) {
      this.setCurrentComponentCtx(null);
    } else {
      this.setCurrentComponentCtx(
        new ComponentCtx({ valComponent: targetValFrame })
      );
    }
  }

  setTriggerEditingTextDataPicker(x: boolean | null) {
    this._triggerEditingTextDataPicker.set(x);
  }

  setEditingTextContext(x: EditingTextContext | null) {
    this._editingTextContext.set(x);

    // Update canvas overlay to exclude the area of the text editor, to allow interactions with it.
    this._editingTextResizeObserver?.disconnect();
    if (x) {
      this._editingTextResizeObserver = new ResizeObserver(
        ([{ target }]: ResizeObserverEntry[]) => {
          this.canvasCtx.updateCanvasOverlay(target.getBoundingClientRect());
        }
      );

      this.renderState.val2dom(x.val, this.canvasCtx).forEach((domElt) => {
        this.canvasCtx.updateCanvasOverlay(domElt.getBoundingClientRect());
        this._editingTextResizeObserver?.observe(domElt);
      });
    } else {
      this.canvasCtx.resetCanvasOverlay();
    }
  }

  selectableToCloneKeys(
    val: Selectable | null | undefined,
    anchorCloneKey = this.focusedCloneKey()
  ) {
    if (val) {
      return this.renderState.sel2CloneKeys(val, anchorCloneKey);
    }
    return [];
  }

  computeFocus(
    val: Selectable | null | undefined,
    anchorCloneKey: string | undefined = this.focusedCloneKey()
  ) {
    if (!val) {
      return {
        val: null,
        focusedTpl: null,
        focusedDom: null,
        focusedClonedKey: null,
      };
    }
    if (val instanceof SlotSelection && val.tpl != null && val.val == null) {
      const maybeValComponent = maybe(
        this.renderState.tpl2bestVal(val.getTpl(), anchorCloneKey),
        (v) => ensureInstance(v, ValComponent)
      );
      if (maybeValComponent) {
        val = val.withVal(maybeValComponent);
      }
    }
    const focusedTpl = switchType(val)
      .when(SlotSelection, (_) => null)
      .when(ValNode, (v) => v.tpl)
      .result();
    // It's possible for val to exist but to render as an empty React
    // component that has no real DOM element (e.g. Overlay).
    const $focusedDom = maybes(val)((v) =>
      this.renderState.sel2dom(v, this.canvasCtx, anchorCloneKey)
    )((x) => $(ensureArray(x)) as JQuery)();
    const focusedCloneKey =
      val && isValSelectable(val) ? this.sel2cloneKey(val) : undefined;
    return { val, focusedTpl, focusedDom: $focusedDom, focusedCloneKey };
  }

  /**
   * This will auto-pop frames off the drill stack as necessary.  It thus
   * assumes the ValNode to select is one along the drill stack so far.  This
   * should be unique since we have no recursion, and the UI currently only
   * supports selecting ValNodes that are in one of the drill stack frames.
   */
  setStudioFocusBySelectable(
    val: Selectable | null | undefined,
    anchorCloneKey = this.focusedCloneKey(),
    opts: { appendToMultiSelection?: boolean } = {}
  ) {
    this.popDrillForTpl(val ? tplFromSelectable(val) : null);
    this.setViewCtxFocusBySelectable(val, anchorCloneKey, opts);
    this.studioCtx.setStudioFocusOnViewCtxContent(this);
  }

  /**
   * Restores the ViewCtx state according to the argument snapshot.  Note that
   * after restoring, the ValNodes may not match up with what is in ValState
   * anymore; someone needs to call updateCtxPostChange() to fix this.  Either
   * this is called right before eval (and eval will call updateCtxPostChange()
   * for you) or you have to do it yourself.
   */
  restoreViewState(view: ViewStateSnapshot) {
    assert(
      view.focusedFrame === this.arenaFrame(),
      () => `Should only restore view state of focused frame`
    );

    this.restoreCurrentComponentCtxAndStack(
      view.currentComponentCtx,
      ensure(
        view.vcComponentStack,
        () =>
          `View must have component stack if view included a focused view ctx`
      )
    );
    if (!view.focusedOnFrame) {
      if (
        view.focusedSelectable &&
        isTplAttachedToSite(this.site, asTpl(view.focusedSelectable))
      ) {
        this.setViewCtxFocusBySelectable(
          view.focusedSelectable,
          view.vcFocusedCloneKey
        );
      } else if (
        view.nextFocusedTpl &&
        isTplAttachedToSite(this.site, view.nextFocusedTpl)
      ) {
        this.setViewCtxFocusByTpl(view.nextFocusedTpl);
      } else {
        this.setViewCtxFocusByTpl(null);
      }
      this.studioCtx.setStudioFocusOnViewCtxContent(this);
    }
  }

  /**
   * See StudioCtx.pruneDetachedTpls().  After restoring an undo record,
   * we check all direct refences ViewCtx has on tpl nodes, and remove
   * those references of those nodes have been detached.
   */
  pruneDetachedTpls() {
    const focusedTpl = this.focusedTpl();
    if (focusedTpl && !isTplAttachedToSite(this.site, focusedTpl)) {
      this.setViewCtxFocusByTpl(null);
    }

    const componentCtx = this.currentComponentCtx();
    if (
      componentCtx &&
      !isTplAttachedToSite(this.site, componentCtx.tplComponent())
    ) {
      this.setCurrentComponentCtxQuietly(null);
    }

    const newStackFrames = this.componentStackFrames().filter((f) =>
      isTplAttachedToSite(this.site, f.tplComponent)
    );
    if (newStackFrames.length !== this.componentStackFrames().length) {
      this._componentStackFrames.replace(newStackFrames);
    }
  }

  setViewCtxHoverBySelectable(
    val: Selectable | null | undefined,
    anchorCloneKey?: string
  ) {
    this.setHoveredSelectable(val);
    const { focusedDom } = this.computeFocus(val, anchorCloneKey);
    this.setHoveredDomElt(focusedDom);
  }

  private setViewCtxFocusBySelectable(
    val: Selectable | null | undefined,
    anchorCloneKey?: string,
    opts: { appendToMultiSelection?: boolean; noRestoreRightTab?: boolean } = {}
  ) {
    opts.appendToMultiSelection =
      this.appCtx.appConfig.multiSelect && !!opts.appendToMultiSelection;

    mobx.runInAction(() => {
      const {
        val: finalVal,
        focusedTpl,
        focusedDom,
        focusedCloneKey,
      } = this.computeFocus(val, anchorCloneKey);

      if (opts.appendToMultiSelection) {
        if (finalVal) {
          if (this._focusedSelectables.includes(finalVal)) {
            // Removing of multi selection
            const idx = this._focusedSelectables.indexOf(finalVal);
            this._focusedSelectables.splice(idx, 1);
            this._focusedTpls.splice(idx, 1);
            this._focusedDomElts.splice(idx, 1);
            this._focusedCloneKeys.splice(idx, 1);
          } else {
            // Adding to multi selection
            this._focusedSelectables = [...this._focusedSelectables, finalVal];
            this._focusedTpls = [...this._focusedTpls, focusedTpl];
            this._focusedDomElts = [
              ...this._focusedDomElts,
              focusedDom ?? null,
            ];
            this._focusedCloneKeys = [
              ...this._focusedCloneKeys,
              focusedCloneKey,
            ];
          }
        }
      } else {
        if (finalVal) {
          const changed = this.focusedSelectable() !== finalVal;
          this._focusedSelectables = [finalVal];
          this._focusedTpls = [focusedTpl];
          this._focusedDomElts = [focusedDom ?? null];
          this._focusedCloneKeys = [focusedCloneKey];
          if (!opts.noRestoreRightTab && changed) {
            this.studioCtx.restoreLastElementTab();
          }
        } else {
          this._focusedSelectables = [];
          this._focusedTpls = [];
          this._focusedDomElts = [];
          this._focusedCloneKeys = [];
        }
      }
    });
  }
  clearViewCtxFocus() {
    // Clear any drilled context on the viewCtx we're defocusing.
    this.setCurrentComponentCtxQuietly(null);
    this.setViewCtxFocusByTpl(null);
    this.setViewCtxHoverBySelectable(null);
  }
  /**
   * @deprecated Use {@link focusedSelectables} to handle multi-selection.
   */
  focusedSelectable(): Selectable | null | undefined {
    return head(this._focusedSelectables);
  }
  focusedSelectables(): (Selectable | null)[] {
    return this._focusedSelectables;
  }

  isStale() {
    return !this.valState().maybeValSysRoot() || !this.syncQueue.idle();
  }
  private mergeEvalArgs(optss: ViewCtxSyncArgs[]): ViewCtxSyncArgs {
    if (optss.length === 1) {
      return optss[0];
    }
    return {
      asap: optss.some((opts) => opts.asap),
      eval: optss.some((opts) => opts.eval),
      styles: optss.some((opts) => opts.styles),
    };
  }
  // Use a set to avoid multiple calls to the same function as it can be registered
  // due to several changes to observables.
  private _canvasRerenderQueue: Set<() => void> = new Set();
  addRerenderObserver(f: () => void) {
    this._canvasRerenderQueue.add(f);
  }
  flushRerenderQueue() {
    const rerenderFns = [...this._canvasRerenderQueue.keys()];
    this._canvasRerenderQueue.clear();
    this.canvasCtx.Sub.ReactDOM.unstable_batchedUpdates(() => {
      rerenderFns.forEach((f) => f());
    });
  }

  private async syncInternal(optss: ViewCtxSyncArgs[]) {
    const opts = this.mergeEvalArgs(optss);
    const doEval = async () => {
      console.log(
        `${this.tplMgr().describeArenaFrame(this.arenaFrame())}: Eval ${
          opts.asap ? "sync" : "async"
        } styles=${opts.styles} eval=${opts.eval}`
      );
      if (opts.styles) {
        this.studioCtx.styleMgrBcast.upsertStyleSheets(this);
        if (this.isFocusedViewCtx()) {
          L.defer(() => this.studioCtx.styleChanged.dispatch());
        }
      }
      if (opts.eval) {
        await this.canvasCtx.hostLessPkgsLock;
        await this.csEvaluator.evalAsync();
        this.flushRerenderQueue();
        const runPostEvalTasks = new Promise<void>((resolve) => {
          defer(async () => {
            if (!this.isDisposed) {
              await this.studioCtx.change(
                ({ success }) => {
                  if (!this.isDisposed) {
                    this.csEvaluator.runPostEvalTasks();
                    this.updateCtxPostChange();
                  }
                  return success();
                },
                {
                  noUndoRecord: true,
                }
              );
            }
            resolve();
          });
        });
        await runPostEvalTasks;
      }
    };

    if (opts.asap) {
      await doEval();
    } else {
      await requestIdleCallbackAsync(async () => {
        if (this._isDisposed) {
          return;
        }
        if (
          this.studioCtx.isPanning() ||
          this.studioCtx.hasPendingModelChanges()
        ) {
          // We're in the middle of panning or other model changes, so this is less important;
          // let's not kick off any expensive operations right now
          console.log("Delaying VC eval");
          spawn(this.syncQueue.push(opts));
        } else {
          await doEval();
        }
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  private syncQueue = asynclib.cargo(
    safeCallbackify(async (args: ViewCtxSyncArgs[]) => this.syncInternal(args))
  );

  scheduleSync(opts: ViewCtxSyncArgs) {
    if (!opts.eval && !opts.styles) {
      return;
    }
    spawn(this.syncQueue.push(opts));
    if (opts.asap) {
      (this.syncQueue as any).process();
    }
  }

  async awaitSync() {
    this.syncQueue.resume();
    return drainQueue(this.syncQueue);
  }

  triggerEditingTextDataPicker() {
    return this._triggerEditingTextDataPicker.get();
  }

  editingTextContext() {
    return this._editingTextContext.get();
  }

  /**
   * Set `forDataRepCollection` if you want to get the canvasEnv with only
   * the items that can be used in the tpl dataRep collection field. This
   * argument is necessary because canvasEnv for a TplNode will contain
   * currentItem and currentIndex *after* the dataRep collection evaluation,
   * which we can't use for the dataRep collection field (it's like trying
   * to do `currentItem.map(currentItem => <Foo />)`).
   *
   * Note: this isn't a `computedFn` because the render state is not mobx
   * reactive as of now. Ideally the first rendered node won't be too far
   * up in the tree from the node being edited.
   */
  getCanvasEnvForTpl = (
    tpl: TplNode,
    opts?: {
      forDataRepCollection?: boolean;
      keep$StateRef?: boolean;
    }
  ) => {
    const closestEnv = computed(
      () => {
        // We find the closest val that has a canvas env for this tpl.
        // We wrap it in computed(), because maybeTpl2ValsInContext()
        // will make use of currently selected val node as anchor,
        // which causes upstream recomputation for every tpl every time
        // selection changes
        let bestTpl = tpl;
        let vals = this.maybeTpl2ValsInContext(bestTpl);
        while (
          (!vals ||
            vals.length === 0 ||
            !vals[0].env ||
            !vals[0].wrappingEnv) &&
          bestTpl.parent
        ) {
          bestTpl = bestTpl.parent;
          vals = this.maybeTpl2ValsInContext(bestTpl);
        }
        if (!vals || vals.length === 0) {
          return undefined;
        }
        const val = vals[0];
        if (
          bestTpl !== tpl &&
          val instanceof ValComponent &&
          val.slotCanvasEnvs.size > 0
        ) {
          // We couldn't get a corresponding `ValNode` for the `tpl`, but we
          // found a corresponding `ValNode` for an ancestor `TplComponent`
          // which provides data to the slots, so we will try to get the
          // `CanvasEnv` from `val.slotCanvasEnvs` in order to include the
          // provided data.
          let ancestorTpl = getAncestorSlotArg(tpl);
          while (ancestorTpl && ancestorTpl.tplComponent !== val.tpl) {
            ancestorTpl = getAncestorSlotArg(ancestorTpl.tplComponent);
          }
          if (
            ancestorTpl &&
            ancestorTpl.tplComponent === val.tpl &&
            val.slotCanvasEnvs.has(ancestorTpl.arg.param)
          ) {
            return ensure(
              val.slotCanvasEnvs.get(ancestorTpl.arg.param),
              () => `Already checked`
            );
          }
        }
        const canvasEnv =
          opts?.forDataRepCollection && bestTpl === tpl
            ? val.wrappingEnv
            : val.env;
        return canvasEnv;
      },
      {
        name: "closestTplEnv",
      }
    ).get();

    if (!closestEnv) {
      return undefined;
    }
    if (opts?.keep$StateRef) {
      return closestEnv;
    }

    // we need to make all plasmic state proxy into aplain object to not mutate it
    // when evaluating exprs outside canvas
    const plainCanvasEnv = Object.fromEntries(
      Object.entries(closestEnv).map(([key, value]) => [
        key,
        // `is$StateProxy` calls `isValtioProxy` which might try to read
        // Plasmic proxy from `mkUndefinedDataProxy` which would throw
        // `PlasmicUndefinedDataError`, so we swallow it here
        swallow(() => this.canvasCtx.Sub.reactWeb.is$StateProxy(value))
          ? L.cloneDeep(value)
          : value,
      ])
    ) as CanvasEnv;
    return plainCanvasEnv;
  };

  getComponentEvalContext(
    tpl: TplTag | TplComponent,
    param?: Param
  ): ComponentEvalContext {
    const linkedProps = isKnownTplComponent(tpl)
      ? getLinkedCodeProps(tpl.component)
      : undefined;
    const maybeLinkedProp = param
      ? linkedProps?.get(param.variable.name)
      : undefined;
    const actualTpl = maybeLinkedProp ? maybeLinkedProp[0] : tpl;
    const valComps = this.maybeTpl2ValsInContext(actualTpl, {
      allowAnyContext: true,
    });
    if (valComps && valComps[0] instanceof ValComponent) {
      const valComp = valComps[0];
      return {
        componentPropValues: valComp.codeComponentProps ?? {},
        invalidArgs: valComp.invalidArgs ?? [],
        ccContextData: this.getContextData(valComp) ?? null,
      };
    }
    return {
      componentPropValues: {},
      invalidArgs: [],
      ccContextData: undefined,
    };
  }

  getCanvas$StateReferencesForTpl(tpl: TplNode) {
    const canvasEnv =
      this.getCanvasEnvForTpl(tpl, { keep$StateRef: true }) ?? {};
    return Object.fromEntries(
      Object.entries(canvasEnv).filter(([_key, val]) =>
        // `is$StateProxy` calls `isValtioProxy` which might try to read
        // Plasmic proxy from `mkUndefinedDataProxy` which would throw
        // `PlasmicUndefinedDataError`, so we swallow it here
        swallow(() => this.canvasCtx.Sub.reactWeb.is$StateProxy(val))
      )
    );
  }

  projectFlags() {
    return this.studioCtx.projectFlags();
  }

  private get$StateInEnv() {
    const component = this.currentComponent();
    const env = this.getCanvasEnvForTpl(component.tplTree, {
      keep$StateRef: true,
    });
    return env?.$state ?? {};
  }

  getCanvasStateValue(state: State) {
    const $state = this.get$StateInEnv();
    const statePath = getStateVarName(state).split(".");
    return generateStateValueProp($state, statePath);
  }

  setCanvasStateValue(state: State, val: any) {
    const $state = this.get$StateInEnv();
    const statePath = getStateVarName(state).split(".");
    generateStateOnChangeProp($state, statePath)(val);
  }

  getStateCurrentInitialValue(state: State) {
    const $state = this.get$StateInEnv();
    const statePath = getStateVarName(state).split(".");
    return this.canvasCtx.Sub.reactWeb.getCurrentInitialValue(
      $state,
      statePath
    );
  }

  resetCanvasStateValue(state: State) {
    const $state = this.get$StateInEnv();
    const statePath = getStateVarName(state).split(".");
    return this.canvasCtx.Sub.reactWeb.resetToInitialValue($state, statePath);
  }

  /**
   * @deprecated Use {@link focusedDomElts} to handle multi-selection.
   */
  focusedDomElt() {
    return head(this._focusedDomElts);
  }

  focusedDomElts() {
    return this._focusedDomElts;
  }

  isFocusedResizable = () => {
    const selectable = this.focusedSelectable();
    if (!selectable || selectable instanceof SlotSelection) {
      return { width: false, height: false };
    }
    return isTplResizable(selectable.tpl, this.variantTplMgr());
  };

  /**
   * @deprecated Use {@link focusedTpls} to handle multi-selection.
   *
   * If includeSlots is true, then also try getting the TplNode from
   * SlotSelection, if that's what's currently selected.
   */
  focusedTpl(includeSlots?: boolean): TplNode | null {
    if (includeSlots == null) {
      includeSlots = false;
    }
    if (includeSlots) {
      const focusObj = this.focusedSelectable();
      return (
        switchType(focusObj)
          .when(SlotSelection, (slotSelection) =>
            (slotSelection.val != null ? slotSelection.val.tpl : undefined) !=
            null
              ? slotSelection.val != null
                ? slotSelection.val.tpl
                : undefined
              : slotSelection.tpl
          )
          .elseUnsafe(() => head(this._focusedTpls)) ?? null
      );
    } else {
      return head(this._focusedTpls) ?? null;
    }
  }
  focusedTpls(): (TplNode | null)[] {
    return this._focusedTpls;
  }
  isFocusedViewCtx() {
    return this.studioCtx.focusedViewCtx() === this;
  }
  highlightedAdoptees() {
    return this._highlightedAdoptees;
  }
  setHighlightedAdoptees(adoptees: Adoptee[]) {
    this._highlightedAdoptees = adoptees;
  }

  isOutOfContext(tpl: TplNode) {
    const spotlightComponent = maybe(this.currentComponentCtx(), (ctx) =>
      ctx.component()
    );
    return (
      !!spotlightComponent &&
      $$$(tpl).tryGetOwningComponent() !== spotlightComponent
    );
  }

  // null means that we're in the top-level context.  The page itself can
  // technically be thought of as a component, but it's not currently
  // represented that way.
  currentComponentCtx() {
    return this._currentComponentCtx;
  }
  private setCurrentComponentCtxQuietly(ctx: ComponentCtx | null) {
    if (
      ctx === this._currentComponentCtx ||
      (!!ctx &&
        !!this._currentComponentCtx &&
        ctx.eq(this._currentComponentCtx))
    ) {
      return;
    }

    if (this._currentComponentCtx && !ctx) {
      // Always reset showDefaultSlotContents to false when we exit component ctx
      this._showDefaultSlotContents = false;
    }
    this._currentComponentCtx = ctx;

    //
    // Now auto-maintain the component stack
    //
    if (ctx) {
      const existingIndex = this._componentStackFrames.findIndex(
        (f) => f.tplComponent === ctx.tplComponent()
      );
      if (existingIndex >= 0) {
        // We're going up the stack
        this._componentStackFrames.replace(
          this._componentStackFrames.slice(0, existingIndex + 1)
        );
        this.setViewCtxHoverBySelectable(null);
      } else {
        // We're adding a new component to the stack
        this._componentStackFrames.push(
          new TransientComponentVariantFrame(ctx.tplComponent())
        );
      }
    } else {
      // We're exiting spotlight mode, so only the root should be on the stack
      this._componentStackFrames.replace([this._componentStackFrames[0]]);
      this.setViewCtxHoverBySelectable(null);
    }
  }
  restoreCurrentComponentCtxAndStack(
    ctx: ComponentCtx | undefined,
    stack: ComponentVariantFrame[]
  ) {
    this.setCurrentComponentCtxQuietly(ctx || null);

    this._componentStackFrames.replace([...stack.map((f) => f.clone())]);

    this._globalFrame.set(new GlobalVariantFrame(this.site, this.arenaFrame()));
  }
  setCurrentComponentCtx(ctx: ComponentCtx | null) {
    if (
      ctx === this._currentComponentCtx ||
      (!!ctx &&
        !!this._currentComponentCtx &&
        ctx.eq(this._currentComponentCtx))
    ) {
      return;
    }

    this.change(() => {
      // Clear focus before setting component ctx.
      this.setViewCtxFocusByTpl(null);
      this.setViewCtxHoverBySelectable(null);

      this.setCurrentComponentCtxQuietly(ctx);
    });
  }

  showDefaultSlotContents() {
    return this._showDefaultSlotContents;
  }
  setShowDefaultSlotContents(show: boolean) {
    this.change(() => {
      this._showDefaultSlotContents = show;
    });
  }
  /**
   * Returns true if we are currently showing default slot contents for
   * `tplComponent`
   */
  showingDefaultSlotContentsFor(tplComponent: TplComponent) {
    return (
      // Either `tplComponent` is the root component -- in which case, we always show
      // default slot contents
      tplComponent === this.tplSysRoot() ||
      // Or, defaultSlotContents mode is turned on, and tplComponent is the
      // current component context
      (this.showDefaultSlotContents() &&
        this.componentStackFrames().some(
          (f) => f.tplComponent === tplComponent
        ))
    );
  }
  /**
   * Returns true if we are currently showing default slot contents for
   * `component`
   */
  showingDefaultSlotContentsForComponent(component: Component) {
    return (
      // Either `tplComponent` is the root component -- in which case, we always show
      // default slot contents
      component === this.component ||
      // Or, defaultSlotContents mode is turned on, and tplComponent is the
      // current component context
      (this.showDefaultSlotContents() &&
        this.componentStackFrames().some(
          (f) => f.tplComponent.component === component
        ))
    );
  }
  enterComponentCtxForVal(val: ValComponent, trigger: "ctrl+enter" | "menu") {
    const cloneKey =
      trigger === "ctrl+enter" ? this.focusedCloneKey() : undefined;
    this.setCurrentComponentCtx(new ComponentCtx({ valComponent: val }));
    if (val.contents && val.contents.length > 0) {
      this.setStudioFocusBySelectable(val.contents[0], cloneKey);
    } else {
      this.setStudioFocusByTpl(val.tpl.component.tplTree, cloneKey);
    }
    trackEvent("ComponentSpotlight", { trigger });
  }
  tagMeta() {
    return metaSvc;
  }
  // Misc view state
  viewState() {
    return this._viewState;
  }
  setViewState(viewState: any) {
    this._viewState = viewState;
  }
  stopUnlogged() {
    this.studioCtx.stopUnlogged();
  }

  startUnlogged() {
    this.studioCtx.startUnlogged();
  }
  isUnlogged() {
    return this.studioCtx.isUnlogged();
  }

  componentStackFrames() {
    return this._componentStackFrames;
  }

  currentComponentStackFrame() {
    return last(this.componentStackFrames());
  }

  currentComponent() {
    return (
      maybe(this.currentComponentCtx(), (cc) => cc.component()) ||
      this.strictComponent()
    );
  }

  /**
   * Returns the "current" TplComponent, which is either the root TplComponent
   * for this frame, or if there's a currentComponentCtx(), the TplComponent
   * in the current context.
   */
  currentTplComponent() {
    return (
      maybe(this.currentComponentCtx(), (cc) => cc.tplComponent()) ||
      this.componentArgsContainer()
    );
  }

  currentValComponent() {
    return (
      maybe(this.currentComponentCtx(), (cc) => cc.valComponent()) ||
      this.valState().valSysRoot()
    );
  }

  /**
   * Creates the variant setting if it doesn't exist.
   */
  currentVariantSetting(tpl: TplNode) {
    return this.variantTplMgr().getCurrentVariantSetting(tpl);
  }

  /**
   * Returns either the variant setting for the current variant, or if none
   * exists, returns the base variant setting.  Only use for reading, not
   * for writing.
   */
  effectiveCurrentVariantSetting(tpl: TplNode) {
    return this.variantTplMgr().effectiveVariantSetting(tpl);
  }

  currentVariantSettingForFocus() {
    const tpl = ensureInstance(
      this.focusedTpl(true),
      TplTag,
      TplComponent,
      TplSlot
    );
    const vs = this.currentVariantSetting(tpl);
    return vs;
  }

  strictComponent() {
    return ensure(this.component, `Expected component to exist`);
  }

  // These root/userRoot/sysRoot are all from the topLevel component
  tplRoot() {
    return this.tplUserRoot();
  }
  tplUserRoot() {
    return this.strictComponent().tplTree;
  }
  tplSysRoot() {
    return this.componentArgsContainer();
  }

  // These root/userRoot/sysRoot are from the current component
  currentCtxTplUserRoot() {
    return this.currentComponent().tplTree;
  }
  currentCtxTplRoot() {
    return this.currentComponent().tplTree;
  }

  componentArgsContainer() {
    return this.arenaFrame().container;
  }

  getTplCodeComponentMeta(tpl: Tpls.TplCodeComponent) {
    return this.getCodeComponentMeta(tpl.component);
  }

  getCodeComponentMeta(comp: CodeComponent) {
    return this.canvasCtx.getRegisteredCodeComponentsMap().get(comp.name)?.meta;
  }

  /**
   * When a brand new Tpl is inserted, we have to wait until it's rendered
   * to select it.  Since any Tpl can result in multiple Vals, we determine the
   * best one to select by using the current selection as an anchor.
   *
   * @param useParentAsAnchor Normally we call bestValForTpl with initialSel
   *   being just the current val selection, but if the corresponding val node
   *   with that key will no longer exist in the newly rendered val tree, then
   *   we instead use the current val selection's parent node as the anchor.
   *   It's a little smarter than just passing initialFocusedSelectable =
   *   SQ(focusedObject).parent() since it handles edge cases like when we're at
   *   the root of a component.
   *
   * @param initialFocusedSelectable Use this instead of the true
   * viewCtx.focusedSelectable.  useParentAsAnchor can still be set to true, in
   * which case the parent calculation is based on this instead of the real
   * focusedSelectable.
   *
   * @param preserveCloneKey Whether to use the `focusedCloneKey` to compute the
   *  new selection.
   */
  selectNewTpl(
    newTpl: TplNode,
    useParentAsAnchor = false,
    initialFocusedSelectable = this.focusedSelectable(),
    preserveCloneKey?: boolean
  ) {
    if (Tpls.isTplVariantable(newTpl)) {
      // need this since style-tab rely on the current VariantSetting to exist.
      // fixupChrome doesn't guarantee this since at that time, newTpl is not
      // yet selected.
      this.variantTplMgr().ensureCurrentVariantSetting(newTpl);
    }

    const cloneKey = preserveCloneKey ? this.focusedCloneKey() : undefined;

    // Immediately set focus by tpl, even though there may not be a corresponding
    // ValNode yet.  This is so that after newTpl is created but before evaluation
    // has finished, the focusedTpl() is pointing to the correct tpl instead
    // of some stale tpl that may no longer be a valid selection.  Example:
    // when converting something into a slot, that something may be be detached
    // from the tpl tree in the process.
    //
    // And we add a postEval() to "fix up" the correct reference to the
    // corresponding val node after evaluation is done.
    this.setStudioFocusByTpl(newTpl, cloneKey);

    // Function called to fix up our undo view state to point
    // to the new selectable, instead of tracking the nextFocusedTpl
    const fixUndoViewState = () => {
      this._nextFocusedTpl = undefined;
      this.studioCtx.createViewStateUndoRecord();
    };

    this._nextFocusedTpl = newTpl;
    const simpleSelect = () => {
      this.postEval(() => {
        if (this.focusedTpl() === newTpl) {
          this.setStudioFocusByTpl(newTpl, cloneKey);
          fixUndoViewState();
        }
      });
    };

    if (
      !initialFocusedSelectable ||
      !isValSelectable(initialFocusedSelectable)
    ) {
      // No existing val selection, so just directly select the tpl.
      return simpleSelect();
    }

    const initialValNode = ensureInstance(
      asVal(initialFocusedSelectable),
      ValNode
    );
    const initialSq = SQ(initialValNode, this.valState()).fullstack();
    const frameNum = initialSq.frameNum();

    let anchorValNode = initialValNode;

    if (useParentAsAnchor) {
      const valParent = initialSq.parent().tryGet();

      if (!valParent || !(valParent instanceof ValNode)) {
        // No parent means this is the top-most element already in the
        // document.  Trivial to just select it directly.
        return simpleSelect();
      }

      const parentFrameNum = initialSq.parent().frameNum();

      // bestValForTpl only works when the initial val we're selecting relative
      // to is in a frame that is at or above the current frame (see that
      // function for an explanation).
      //
      // Normally we rely on the parent being in the same frame.  But if the
      // removed ValNode is a component root, then the parent is in a higher
      // frame (the parent is another ValComponent, different from the one
      // being inserted!).  Womp womp.  So we special case this code path to
      // just select the child we inserted.

      if (parentFrameNum !== frameNum) {
        this.postEval(() => {
          if (this.focusedTpl() === newTpl) {
            this.setStudioFocusBySelectable(
              SQ(this.renderState.tryGetUpdatedVal(valParent), this.valState())
                .fullstack()
                .firstChild()
                .tryGet(),
              cloneKey
            );
            fixUndoViewState();
          }
        });
        return;
      }

      anchorValNode = valParent;
    }

    this.postEval(() => {
      if (this.focusedTpl() === newTpl) {
        // The anchor may not exist at the same key anymore in the new ValState
        const initialSel = this.renderState.tryGetUpdatedVal(anchorValNode);
        if (initialSel) {
          const bestVal = bestValForTpl(
            newTpl,
            frameNum,
            this.valState(),
            initialSel,
            this.tplUserRoot()
          );
          // It's possible that bestVal returns undefined because of a inconsistency in valNodes caused by fake nodes created
          // by globalHook, since the fake nodes are linked in the tree only for properly detecting the owner (valOwner) of
          // a given element, they don't have parent links. In this case, we just select the newTpl directly without heuristics.
          if (bestVal) {
            this.setStudioFocusBySelectable(bestVal, cloneKey);
          } else {
            this.setStudioFocusByTpl(newTpl, cloneKey);
          }
        } else {
          this.setStudioFocusByTpl(newTpl, cloneKey);
        }
        fixUndoViewState();
      }
    });
  }

  /**
   * Select nodes after they were pasted or drag-n-dropped. This uses
   * `postEval` because nodes are not rendered before evaluation when
   * they're being inserted.
   */
  selectNewTpls(tpls: TplNode[]) {
    for (let i = 0; i < tpls.length; i++) {
      this.setStudioFocusByTpl(tpls[i], undefined, {
        appendToMultiSelection: i !== 0,
      });
    }
    this.postEval(() => {
      for (let i = 0; i < tpls.length; i++) {
        this.setStudioFocusByTpl(tpls[i], undefined, {
          appendToMultiSelection: i !== 0,
        });
      }
    });
  }

  selectFromSelectionId(selectableKey?: string) {
    if (this.hasValState) {
      this.setStudioFocusBySelectable(
        this.getSelectableFromSelectionId(selectableKey)
      );
      return;
    }
    this.postEval(() => {
      this.setStudioFocusBySelectable(
        this.getSelectableFromSelectionId(selectableKey)
      );
    });
  }

  getSelectableFromSelectionId(selectableKey?: string) {
    const tryGetSelectableFromKey = (key: string) => {
      const maybeVal = this.renderState.fullKey2val(key);
      if (maybeVal) {
        return maybeVal;
      }
      // Try get a SlotSelection
      const [valCompKey, paramUuid] = key.split("~");
      if (!valCompKey || !paramUuid) {
        return undefined;
      }
      const valComp = this.renderState.fullKey2val(valCompKey);
      if (!valComp || !(valComp instanceof ValComponent)) {
        return undefined;
      }
      const param = valComp.tpl.component.params.find(
        (p) => p.uuid === paramUuid
      );
      if (!param) {
        return undefined;
      }
      return new SlotSelection({ slotParam: param, val: valComp });
    };
    return selectableKey
      ? tryGetSelectableFromKey(selectableKey)
      : this.valState().maybeValUserRoot();
  }

  /**
   * Tries to re-pick and set the focusedDomElts based on the current
   * focusedSelectable. Useful for when focusedSelectable/tpl
   * have been set, but focusedDomElts have not yet because rendering has
   * not finished.
   */
  recomputeFocusedDomElts() {
    if ((this.focusedSelectables()?.length ?? 0) > 1) {
      // TODO(multi)
      return false;
    }

    const newDoms = this.computeFocus(
      this.focusedSelectable(),
      this.focusedCloneKey()
    ).focusedDom;
    const focusedDomElt = this.focusedDomElt();
    if (
      !newDoms ||
      !focusedDomElt ||
      !arrayEq(Array.from(focusedDomElt), Array.from(newDoms))
    ) {
      this._focusedDomElts =
        this.focusedSelectables()?.length === 1 ? [newDoms ?? null] : [];
      return true;
    }
    return false;
  }

  change(f: () => void) {
    this.studioCtx.changeSpawn(() => {
      // Only invoke f if this ViewCtx has not been disposed in the meanwhile
      if (!this._isDisposed) {
        f();
      }
    });
  }

  private _dndMgr: any;
  _unsafeDndMgr() {
    return this._dndMgr;
  }
  _unsafeSetDndMgr(dndMgr: any) {
    this._dndMgr = dndMgr;
  }

  bundleAllForTransport() {
    const allBundle = this.studioCtx.bundleSite() as any;
    allBundle.siteId = this.siteInfo.id;
    return allBundle;
  }

  eltFinder = (val: ValNode) => {
    return this.renderState.sel2dom(val, this.canvasCtx);
  };

  postEval(f: () => any) {
    this.csEvaluator.addPostEval(f);
  }

  valState() {
    return this.csEvaluator.valState();
  }

  /**
   * Returns a CmpTplMgr that is variant-aware.  If we are creating a TplTag
   * while a non-base variant is selected, we make it conditionally shown only
   * in this variant.
   */
  variantTplMgr(fixdComponentStackFrames?: boolean) {
    return new VariantTplMgr(
      fixdComponentStackFrames
        ? this.componentStackFrames().slice()
        : this.componentStackFrames(),
      this.site,
      this.tplMgr(),
      this.globalFrame,
      this.getCanvasEnvForTpl
    );
  }

  /**
   * After re-rendering, updates all references to ValNodes in ViewCtx with
   * updated ValNodes from ValState.  Also fixes up what should be in focus.
   *
   * This should be called from cseval after eval-render pass.  At this
   * stage, the valState() has the new valnodes.
   */
  updateCtxPostChange() {
    // Helper function that tries to return the new ValNode with the argument key
    const getMatchingValInUpdatedTree = <T extends ValNode>(
      valNode: T
    ): T | undefined => {
      return this.renderState.tryGetUpdatedVal(valNode);
    };

    // Helper function that checks if tpl is in the current component context
    const tplInContext = (tpl: TplNode) =>
      $$$(tpl).ancestors().last().get(0) === this.currentCtxTplRoot();

    // First, we fix up ComponentCtx, which has a reference to ValComponent
    const curCompCtx = this.currentComponentCtx();
    if (curCompCtx != null) {
      // This may set the context to null if the ValComponent no longer exists.
      const newValComponent = getMatchingValInUpdatedTree(
        curCompCtx.valComponent()
      );
      if (newValComponent) {
        if (curCompCtx.valComponent() !== newValComponent) {
          this._currentComponentCtx = new ComponentCtx({
            valComponent: newValComponent as ValComponent,
          });
        }
      } else {
        // It is ok to clear the viewCtx context - the setTplVisibility event
        // will be propagate to parent and trigger a re-focus event.
        this.clearViewCtxFocus();
        return;
      }
    }

    const getUpdatedMatchingSelectable = (obj: Selectable) => {
      return switchType(obj)
        .when(SlotSelection, (slotSelection: /*TWZ*/ SlotSelection) => {
          if (slotSelection.val != null) {
            const val = getMatchingValInUpdatedTree(slotSelection.val);
            if (val != null) {
              return slotSelection.withVal(ensureInstance(val, ValComponent));
            } else {
              return null;
            }
          } else {
            return slotSelection;
          }
        })
        .when(ValNode, (valNode) => getMatchingValInUpdatedTree(valNode))
        .result();
    };

    // Next, we fix up focused selectables.
    const objs = this.focusedSelectables();
    const tpls = this.focusedTpls();
    const cloneKeys = this.focusedCloneKeys();
    let focusedCount = 0;
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      const tpl = tpls[i];
      const cloneKey = cloneKeys[i];

      if (obj) {
        const newObj = getUpdatedMatchingSelectable(obj);

        if (newObj) {
          this.setViewCtxFocusBySelectable(newObj, cloneKey, {
            appendToMultiSelection: focusedCount > 0,
            noRestoreRightTab: true,
          });
          focusedCount++;
        } else {
          // If we can't map the old Selectable to a new Selectable, then the
          // val no longer exists; but maybe its tpl still does! So try to see if the
          // tpl is still there.  This is important for when you are causing the dataRep or
          // dataCond to no longer generate that val - you still want to be
          // able to keep editing that tpl, rather than have it disappear on
          // you suddenly in the right pane.
          if (obj instanceof SlotSelection && tplInContext(obj.getTpl())) {
            this.setViewCtxFocusBySelectable(obj.valToTpl(), undefined, {
              appendToMultiSelection: focusedCount > 0,
              noRestoreRightTab: true,
            });
            focusedCount++;
          } else if (obj instanceof ValNode && tplInContext(obj.tpl)) {
            this.setViewCtxFocusByTpl(obj.tpl, undefined, {
              appendToMultiSelection: focusedCount > 0,
              noRestoreRightTab: true,
            });
            focusedCount++;
          }
        }
      } else if (tpl && tplInContext(tpl)) {
        // It's possible that there's a focused tpl, but no corresponding focusedSelectable,
        // because at the time of focus, we were still rendering the val tree so did not find
        // a corresponding valnode.  If so, set it now.
        this.setViewCtxFocusByTpl(tpl, undefined, {
          appendToMultiSelection: focusedCount > 0,
          noRestoreRightTab: true,
        });
        focusedCount++;
      }
    }
    if (objs.length > 0 && !focusedCount) {
      // Finally, if all else failed, select the root node
      this.setViewCtxFocusByTpl(this.currentCtxTplUserRoot(), undefined, {
        noRestoreRightTab: true,
      });
    }

    // Next, we fix up the hovered Selectable
    const hoveredObj = this.hoveredSelectable();
    if (hoveredObj) {
      const newObj = getUpdatedMatchingSelectable(hoveredObj);
      // We don't try as hard to match this to an updated selectable as we do for
      // focused selectable, as we don't care that much about the hovered object.
      // If there's nothing matching, so be it.
      this.setViewCtxHoverBySelectable(newObj);
    }

    if (this._editingTextContext.get()) {
      const newVal =
        getMatchingValInUpdatedTree(this._editingTextContext.get()?.val!) ??
        null;
      if (newVal) {
        if (newVal !== this._editingTextContext.get()?.val) {
          this.setEditingTextContext({
            val: newVal,
            targetVs: this._editingTextContext.get()?.targetVs!,
            draftText: maybe(newVal.text, (text) =>
              ensureInstance(text, RawText, RawTextLike)
            ),
            run: undefined,
            editor: undefined,
          });
        }
      } else {
        this.setEditingTextContext(null);
      }
    }
  }

  /**
   * Returns useful information to decide whether or not a frame needs to be
   * re-rendered after a change.
   */
  getSpotlightAndVariantsInfo(): SpotlightAndVariantsInfo {
    const lastComponentFrame = ensure(
      L.last(this.componentStackFrames()),
      () => `Must be at least one component stack frame in spotlight mode`
    );
    return {
      componentStackFrameLength: this.componentStackFrames().length,
      lastComponentFrame,
      viewMode: this.arenaFrame().viewMode,
      showDefaultSlotContents: this.showDefaultSlotContents(),
      pinnedVariants: {
        ...lastComponentFrame.getPlainPins(),
        ...this.arenaFrame().pinnedGlobalVariants,
        ...Object.fromEntries(
          lastComponentFrame.getTargetVariants().map((v) => tuple(v.uuid, true))
        ),
        ...Object.fromEntries(
          this.arenaFrame().targetGlobalVariants.map((v) => tuple(v.uuid, true))
        ),
      },
      focusedSelectable: this.focusedSelectable() ?? undefined,
      focusedTpl: this.focusedTpl() ?? undefined,
    };
  }

  focusedTplOrSlotSelection() {
    const focusedSelectable = this.focusedSelectable();
    return focusedSelectable instanceof SlotSelection
      ? focusedSelectable
      : this.focusedTpl();
  }

  focusedTplsOrSlotSelections() {
    return this._focusedSelectables.map((sel, i) =>
      sel instanceof SlotSelection ? sel : this._focusedTpls[i]
    );
  }

  isVisible() {
    if (
      !getArenaFrames(this.studioCtx.currentArena).includes(this.arenaFrame())
    ) {
      return false;
    }

    if (this.studioCtx.isLiveMode && this.studioCtx.focusedViewCtx() === this) {
      return true;
    }

    const visibleScalerBox = this.viewportCtx.visibleScalerBox();
    const frameScalerRect = this.studioCtx.getArenaFrameScalerRect(
      this.arenaFrame()
    );
    return frameScalerRect
      ? rectsIntersect(visibleScalerBox.rect(), frameScalerRect)
      : true;
  }

  ancestorComponents(valNode: /*TWZ*/ ValComponent | ValComponent) {
    const first = valNode instanceof ValComponent ? [valNode] : [];
    return [...[...first], ...[...this.valState().valOwners(valNode)]];
  }
  // Goes bottom-up, from given node to root, excluding given node.
  parentComponents(valNode: ValNode): ValComponent[] {
    return this.valState().valOwners(valNode);
  }

  get hasValState() {
    return !!this.valState().maybeValSysRoot();
  }

  customFunctionsSchema() {
    return this.studioCtx.customFunctionsSchema();
  }

  get customFunctions() {
    const getFunctionImplementation = (customFunction: CustomFunction) =>
      this.canvasCtx
        .getRegisteredFunctionsMap()
        .get(customFunctionId(customFunction))?.function;
    // Subscribe to changes to the registered hostless libs
    this.canvasCtx.installedHostLessPkgs.size;
    this.canvasCtx.installedHostLessPkgs.forEach(() => {
      /* empty */
    });
    return Object.fromEntries<Function | { [key: string]: Function }>(
      withoutNils([
        ...[
          ...allCustomFunctions(this.site)
            .map(({ customFunction }) => customFunction)
            .filter((f) => !f.namespace),
          ...Object.values(
            groupBy(
              allCustomFunctions(this.site)
                .map(({ customFunction }) => customFunction)
                .filter((f) => !!f.namespace),
              (f) => f.namespace
            )
          ),
        ].map((functionOrGroup) =>
          !Array.isArray(functionOrGroup)
            ? maybe(
                getFunctionImplementation(functionOrGroup),
                (impl) => [functionOrGroup.importName, impl] as const
              )
            : ([
                functionOrGroup[0].namespace!,
                Object.fromEntries<Function>(
                  withoutNils(
                    functionOrGroup.map((customFunction) =>
                      maybe(
                        getFunctionImplementation(customFunction),
                        (impl) => [customFunction.importName, impl] as const
                      )
                    )
                  )
                ),
              ] as const)
        ),
        ...this.canvasCtx
          .getRegisteredLibraries()
          .map((lib) => [lib.meta.jsIdentifier, lib.lib] as const),
      ])
    );
  }

  // Fiber Related methods

  dom2val<T extends object = HTMLElement>(
    $dom: JQuery<T>
  ): Selectable | undefined {
    return this.dom2focusObj($dom);
  }
  dom2tpl<T extends object = HTMLElement>($dom: JQuery<T>) {
    return ensure(this.dom2val($dom), "Couldn't find ValNode from DOM").tpl;
  }
  dom2focusObj<T extends object = HTMLElement>(
    $dom: /*TWZ*/ JQuery<T>
  ): ValNode | SlotSelection | undefined {
    for (const elt of $dom.toArray()) {
      // React attaches the fiber node associated to the DOM node it renders
      // It can be found as an entry whose key starts with __reactInternalInstance$
      // (or __reactFiber$ for React 17)
      const key = Object.keys(elt).find(
        (k) =>
          k.startsWith("__reactInternalInstance$") ||
          k.startsWith("__reactFiber$")
      );
      if (!key) {
        continue;
      }
      const maybeSelectable = this.fiberNodeToPlasmicData(elt[key]);
      if (maybeSelectable) {
        return maybeSelectable;
      }
    }
    return undefined;
  }
  sel2cloneKey(sel: Selectable | undefined | null) {
    if (!sel) {
      return undefined;
    } else if (sel instanceof SlotSelection) {
      return `${ensure(sel.val, `must be a val SlotSelection`).fullKey}~${
        sel.slotParam.uuid
      }`;
    } else {
      return sel.fullKey;
    }
  }

  /**
   * Similar to `instanceof Element` but also checks for Sub.Element
   */
  isElement(v: any): v is Element {
    return v instanceof Element || v instanceof this.canvasCtx.Sub.localElement;
  }

  private fiberNodeToPlasmicData(
    fiber: Fiber
  ): ValNode | SlotSelection | undefined {
    let initialNode = true;
    // The ValNode might be passed to the enclosing component that rendered
    // this element, so go up in the Fiber tree.
    while (fiber) {
      fiber = getMostRecentFiberVersion(fiber);
      const selectable: ValNode | undefined =
        globalHookCtx.fiberToVal.get(fiber);
      if (selectable) {
        return selectable;
      }

      const slotPlaceholderKey =
        globalHookCtx.fiberToSlotPlaceholderKeys.get(fiber);
      if (slotPlaceholderKey) {
        const slotSelection = slotPlaceholderKey.toSlotSelection();
        const valComponentStack = slotSelection ? this.valComponentStack() : [];
        if (
          slotSelection &&
          (valComponentStack.length === 0 ||
            slotSelection.val !==
              valComponentStack[valComponentStack.length - 1])
        ) {
          return slotSelection;
        }
      }

      if (!fiber.return || (!initialNode && this.isElement(fiber.stateNode))) {
        // Exit if we hit another DOM node
        break;
      }
      fiber = fiber.return;
      initialNode = false;
    }
    return undefined;
  }

  use$StateForRoot() {
    const component = this.currentComponent();
    const canvasEnv = this.getCanvasEnvForTpl(component.tplTree);
    const stateSpecs = component.states.map((state) => ({
      path: getStateVarName(state),
      type: state.accessType as "private" | "readonly" | "writable",
      ...(state.param.defaultExpr
        ? {
            initFunc: evalCodeWithEnv(
              `($props, $state, $ctx) => (${getRawCode(
                state.param.defaultExpr,
                {
                  projectFlags: this.projectFlags(),
                  component,
                  inStudio: true,
                }
              )})`,
              {},
              this.canvasCtx.win()
            ),
          }
        : {}),
      ...(state.accessType !== "private"
        ? { onChangeProp: getStateOnChangePropName(state) }
        : {}),
      ...(state.accessType === "writable"
        ? { valueProp: getStateValuePropName(state) }
        : {}),
      variableType: state.variableType as StateVariableType,
    }));
    return useDollarState(stateSpecs, canvasEnv?.$props ?? {});
  }
}

export interface ViewComponentProps {
  viewCtx: ViewCtx;
}

export abstract class ViewComponentBase<P = {}, S = {}> extends React.Component<
  P,
  S
> {
  baseApi() {
    return this.dbCtx().api._siteApi._api;
  }

  site() {
    return this.dbCtx().site;
  }

  app() {
    return this.dbCtx().app;
  }

  abstract viewCtx(): ViewCtx;
  dbCtx() {
    return this.viewCtx().dbCtx();
  }
  postEval(f) {
    return this.viewCtx().postEval(f);
  }
  viewOps() {
    return this.viewCtx().viewOps;
  }
  currentCtxTplRoot() {
    return this.viewCtx().currentCtxTplRoot();
  }
  change(f: () => void) {
    return this.viewCtx().change(f);
  }

  /**
   * Either the currently drilled component, or the root edited component.
   */
  currentComponent() {
    return this.viewCtx().currentComponent();
  }

  valComponentStack() {
    return this.viewCtx().valComponentStack();
  }

  tplRoot() {
    return this.viewCtx().tplRoot();
  }
  tplUserRoot() {
    return this.viewCtx().tplUserRoot();
  }
  tplSysRoot() {
    return this.viewCtx().tplSysRoot();
  }
  component() {
    return ensure(
      this.maybeComponent(),
      () => `ViewCtx always associated with a Component`
    );
  }
  maybeComponent() {
    return this.viewCtx().component;
  }
  canvasCtx() {
    return this.viewCtx().canvasCtx;
  }
  eltFinder() {
    return this.viewCtx().eltFinder;
  }
  clipboard() {
    return this.viewCtx().clipboard;
  }
  styleMgr() {
    return this.viewCtx().styleMgr;
  }
  isLiveMode() {
    return this.viewCtx().studioCtx.isLiveMode;
  }
  isDevMode() {
    return !this.isLiveMode();
  }
  componentArgsContainer() {
    return this.viewCtx().componentArgsContainer();
  }
  tagMeta() {
    return this.viewCtx().tagMeta();
  }

  tplMgr() {
    return this.viewCtx().tplMgr();
  }

  selectNewTpl(
    newTpl: TplNode,
    useParentAsAnchor = false,
    initialFocusedSelectable = this.viewCtx().focusedSelectable()
  ) {
    return this.viewCtx().selectNewTpl(
      newTpl,
      useParentAsAnchor,
      initialFocusedSelectable
    );
  }

  valState() {
    return this.viewCtx().valState();
  }
}

export class ViewComponent<
  P extends ViewComponentProps = ViewComponentProps,
  S = {}
> extends ViewComponentBase<P, S> {
  viewCtx() {
    return this.props.viewCtx;
  }
}

export function ensureBaseRs(
  viewCtx: ViewCtx,
  tpl: TplTag | TplComponent,
  props: CSSProperties = {},
  text: RichText | undefined = undefined
) {
  const vs = viewCtx.variantTplMgr().ensureBaseVariantSetting(tpl);
  if (L.size(props) > 0 || !!text) {
    if (text) {
      vs.text = text;
    }
    RSH(vs.rs, tpl).merge(props);
  }
  return vs.rs;
}

export function ensureVariantRs(
  viewCtx: ViewCtx,
  tpl: TplTag | TplComponent,
  variant: Variant,
  props: CSSProperties = {}
) {
  const vs = viewCtx.variantTplMgr().ensureVariantSetting(tpl, [variant]);
  if (L.size(props) > 0) {
    RSH(vs.rs, tpl).merge(props);
  }
  return vs.rs;
}

export function getSetOfVariantsForViewCtx(
  viewCtx: ViewCtx,
  bundler: FastBundler
) {
  return sortBy(
    [
      ...viewCtx.currentComponentStackFrame().getPinnedVariants().keys(),
      ...viewCtx.globalFrame.getPinnedVariants().keys(),
      ...viewCtx.currentComponentStackFrame().getTargetVariants(),
      ...viewCtx.globalFrame.getTargetVariants(),
    ],
    (v) => bundler.addrOf(v)?.iid
  );
}
