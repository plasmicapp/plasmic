import { useCanvasForceUpdate } from "@/wab/client/components/canvas/canvas-hooks";
import { mkUseCanvasObserver } from "@/wab/client/components/canvas/canvas-observer";
import {
  PinMap,
  useRenderedFrameRoot,
} from "@/wab/client/components/canvas/canvas-rendering";
import {
  ClientPinManager,
  makeVariantEvalState,
} from "@/wab/client/components/variants/ClientPinManager";
import { globalHookCtx } from "@/wab/client/react-global-hook/globalHook";
import {
  getRenderState,
  RenderState,
} from "@/wab/client/studio-ctx/renderState";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ContextFactory } from "@/wab/shared/code-components/context-factory";
import {
  ensure,
  ensureInstance,
  spawn,
  strictZip,
  tuple,
  undefinedToDefault,
  xOmitNils,
} from "@/wab/shared/common";
import {
  ComponentVariantFrame,
  GlobalVariantFrame,
} from "@/wab/shared/component-frame";
import { wrapWithContext } from "@/wab/shared/contexts";
import {
  allComponentVariants,
  isContextCodeComponent,
} from "@/wab/shared/core/components";
import { allGlobalVariants } from "@/wab/shared/core/sites";
import { ValComponent, ValNode } from "@/wab/shared/core/val-nodes";
import { ValState } from "@/wab/shared/eval/val-state";
import { TplNode, Variant } from "@/wab/shared/model/classes";
import { getImplicitlyActivatedStyleVariants } from "@/wab/shared/Variants";
import { autorun, computed, observable } from "mobx";
import React from "react";
import defer = setTimeout;

function getActivatedVariants(
  variants: Variant[],
  compFrame: ComponentVariantFrame,
  globalFrame: GlobalVariantFrame,
  evalState?: Map<Variant, boolean>,
  focusedTpl?: TplNode | null
) {
  const pinManager = new ClientPinManager(
    compFrame,
    globalFrame,
    evalState ?? new Map()
  );
  const activeMap = new Map(
    variants.map((v) => tuple(v, pinManager.isActive(v)))
  );
  const activeVariants = [...activeMap.entries()]
    .filter(([_v, active]) => !!active)
    .map(([v]) => v);
  for (const implicitVariant of getImplicitlyActivatedStyleVariants(
    variants,
    new Set(activeVariants),
    focusedTpl
  )) {
    activeMap.set(implicitVariant, true);
  }
  return activeMap;
}

export abstract class BaseCliSvrEvaluator {
  _viewCtx: ViewCtx;
  private _postEvalTasks: (() => any)[] = [];
  private _contextFactory: ContextFactory;
  private _renderState: RenderState;

  private _renderCount = observable.box(0);
  private incrementRenderCount() {
    this._renderCount.set(this._renderCount.get() + 1);
  }
  get renderCount() {
    return this._renderCount.get();
  }

  private _isFirstRenderComplete = computed(() => {
    return this.renderCount > 0;
  });

  get isFirstRenderComplete() {
    return this._isFirstRenderComplete.get();
  }

  constructor({ viewCtx }: { viewCtx: ViewCtx }) {
    this._viewCtx = viewCtx;

    this._contextFactory = new ContextFactory(viewCtx.site);

    if (!globalHookCtx.frameUidToValRoot.has(viewCtx.arenaFrame().uid)) {
      globalHookCtx.frameUidToValRoot.set(viewCtx.arenaFrame().uid, null);
    }

    this._renderState = getRenderState(this._viewCtx.arenaFrame().uid);

    this.valRootDispose = autorun(() => {
      this.valRoot = globalHookCtx.frameUidToValRoot.get(
        viewCtx.arenaFrame().uid
      );
      // New Val Tree - we might need to rerender the aartboard to get
      // the updated component stack
      defer(() => !viewCtx.isDisposed && viewCtx.flushRerenderQueue());
      defer(() => {
        if (!viewCtx.isDisposed && !viewCtx.focusedSelectable()) {
          spawn(
            viewCtx.studioCtx.change(
              ({ success }) => {
                const focusedTpl = viewCtx.focusedTpl();
                if (focusedTpl) {
                  viewCtx.setStudioFocusByTpl(focusedTpl);
                }
                return success();
              },
              { noUndoRecord: true }
            )
          );
        }
      });
    });
  }

  get renderState() {
    return this._renderState;
  }

  private valRootDispose: () => void;

  private _valRoot = observable.box<ValComponent | null | undefined>();

  get valRoot() {
    return this._valRoot.get();
  }

  set valRoot(root: ValComponent | null | undefined) {
    this._valRoot.set(root);
  }

  valState() {
    let sysRoot: ValNode | null | undefined = this.valRoot;
    while (
      sysRoot instanceof ValComponent &&
      isContextCodeComponent(sysRoot.tpl.component)
    ) {
      sysRoot =
        sysRoot.contents && sysRoot.contents.length > 0
          ? ensureInstance(sysRoot.contents[0], ValComponent)
          : undefined;
    }
    return new ValState({
      sysRoot: (sysRoot && ensureInstance(sysRoot, ValComponent)) ?? undefined,
      globalRoot: this.valRoot ?? undefined,
    });
  }

  dispose() {
    this.renderState.dispose();
    this.valRootDispose();
    (this._viewCtx as any) = null;
  }

  private viewCtx() {
    return this._viewCtx;
  }

  rootNode: React.ReactNode | undefined = undefined;

  private cliEval() {
    const viewCtx = this.viewCtx();
    if (this.rootNode == null) {
      this.rootNode = this.renderRoot();
      viewCtx.canvasCtx.rerender(this.rootNode, viewCtx);
    }
    this.addPostEval(() => {
      this.incrementRenderCount();
    });
  }

  private renderRoot() {
    const vc = this.viewCtx();
    const sub = vc.canvasCtx.Sub;
    // We need to create a single node and make it rerender after observable
    // changes instead of create several root nodes to avoid unmounting the
    // canvas (currently `Sub.setPlasmicRootNode` forces the tree to remount)
    return sub.React.createElement(() => {
      const forceUpdate = useCanvasForceUpdate(sub, false);
      return mkUseCanvasObserver(sub, vc)(
        () => {
          const tpl = vc.componentArgsContainer();
          const tplRootWithContexts = wrapWithContext(
            tpl,
            vc.site.globalContexts,
            this._contextFactory
          );

          let reactRoot = useRenderedFrameRoot(vc, tplRootWithContexts);

          if (tpl.component.pageMeta) {
            const pageParamsProviderProps = tpl.component.pageMeta
              ? {
                  route: tpl.component.pageMeta.path,
                  params: { ...tpl.component.pageMeta.params },
                  query: { ...tpl.component.pageMeta.query },
                }
              : {};
            if (pageParamsProviderProps && !!sub.PageParamsProvider) {
              reactRoot = sub.React.createElement(
                sub.PageParamsProvider,
                pageParamsProviderProps,
                reactRoot
              );
            }
          }
          return reactRoot;
        },
        `renderRoot`,
        forceUpdate
      );
    });
  }

  addPostEval(f: /*TWZ*/ () => any) {
    return this._postEvalTasks.push(f);
  }

  runPostEvalTasks() {
    const origPostEvalTasks = this._postEvalTasks || [];
    this._postEvalTasks = [];
    for (const task of origPostEvalTasks) {
      task();
    }
  }

  async evalAsync() {
    return this.cliEval();
  }

  protected abstract serverEval();
}

// This evaluator evaluates a tree of TplNode into a tree of CanvasElements. Internally,
// it uses viewCtx().evaluator() to evalutes the TplNode tree into a ValNode tree in between.
export class DevCliSvrEvaluator extends BaseCliSvrEvaluator {
  serverEval() {
    throw new Error();
  }
}

export function buildViewCtxPinMaps(vc: ViewCtx) {
  const rootKey = [
    ...vc.site.globalContexts.map(
      (tpl) =>
        `${tpl.uuid}.${
          ensure(
            tpl.component.params.find((p) => p.variable.name === "children"),
            () => `Global contexts must have a param named "children"`
          ).uuid
        }`
    ),
  ].join(".");
  const pinMap: PinMap = new Map(
    // Variant pins are specified in ComponentStackFrames.  Evaluator uses a PinMap,
    // which maps ValNode keys to variant pins.  This means, however, that we need
    // to have done eval at least once (mayValSysRoot() is not null) before
    // will even have ValNodes with keys.  The exception is for the root ValNode,
    // which always has the key of "".
    strictZip(
      vc.componentStackFrames(),
      vc.valState().maybeValSysRoot() ? vc.valComponentStack() : [null]
    ).flatMap(([frame, owner]) => {
      const ownerKey = !owner
        ? `${rootKey}.${frame.tplComponent.uuid}`
        : owner.key;
      // Convert WeakMap to Map
      const compVariants = allComponentVariants(frame.tplComponent.component, {
        includeSuperVariants: true,
      });
      const evalState = owner ? makeVariantEvalState(vc, owner) : undefined;
      const compPins = getActivatedVariants(
        compVariants,
        frame,
        vc.globalFrame,
        evalState,
        vc.focusedTpl()
      );
      return [tuple(ownerKey, xOmitNils(compPins))];
    })
  );
  const pinManager = new ClientPinManager(
    vc.componentStackFrames()[0],
    vc.globalFrame,
    new Map()
  );
  const globalPins = undefinedToDefault(
    new Map(
      allGlobalVariants(vc.site, { includeDeps: "direct" }).map((v) =>
        tuple(v, pinManager.isActive(v))
      )
    ),
    false
  );

  return { globalPins, pinMap };
}
