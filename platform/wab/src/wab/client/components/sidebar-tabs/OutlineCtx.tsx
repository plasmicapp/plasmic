import { isElementWithComments } from "@/wab/client/components/comments/utils";
import { Matcher } from "@/wab/client/components/view-common";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { CommentsData } from "@/wab/client/components/comments/CommentsProvider";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  eagerCoalesce,
  ensure,
  filterMapTruthy,
  maybe,
  switchType,
  tuple,
  withoutNils,
} from "@/wab/shared/common";
import { toOpaque } from "@/wab/commons/types";
import { isCodeComponent } from "@/wab/shared/core/components";
import { getOnlyAssetRef } from "@/wab/shared/core/image-assets";
import { FrameViewMode } from "@/wab/shared/Arenas";
import { isTplSlotVisible } from "@/wab/shared/cached-selectors";
import { isPlainObjectPropType } from "@/wab/shared/code-components/code-components";
import {
  EffectiveVariantSetting,
  getTplComponentActiveVariants,
} from "@/wab/shared/effective-variant-setting";
import {
  COMMENTS_LOWER,
  INTERACTIVE_CAP,
  REPEATED_CAP,
} from "@/wab/shared/Labels";
import {
  ArenaFrame,
  Component,
  ensureKnownRenderExpr,
  isKnownArenaFrame,
  isKnownNodeMarker,
  isKnownRawText,
  isKnownRenderExpr,
  isKnownTplComponent,
  isKnownTplNode,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
} from "@/wab/shared/model/classes";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import { ReadonlyIRuleSetHelpersX } from "@/wab/shared/RuleSetHelpers";
import {
  getSlotParams,
  getTplSlotForParam,
  isTplPlainText,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  isVisibilityHidden,
  TplVisibility,
} from "@/wab/shared/visibility-utils";
import { isTplAttachedToSite } from "@/wab/shared/core/sites";
import { SlotSelection } from "@/wab/shared/core/slots";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  isTplImage,
  isTplTagOrComponent,
  summarizeSlotParam,
} from "@/wab/shared/core/tpls";
import { ValComponent } from "@/wab/shared/core/val-nodes";
import { asTpl, asTplOrSlotSelection } from "@/wab/shared/core/vals";
import * as Immutable from "immutable";
import debounce from "lodash/debounce";
import {
  autorun,
  computed,
  IObservableValue,
  observable,
  reaction,
  runInAction,
} from "mobx";
import { computedFn } from "mobx-utils";
import type { Opaque } from "type-fest";

export type OutlineNodeKey = Opaque<string, "OutlineNodeKey">;

export interface OutlineNodeData {
  key: OutlineNodeKey;
  item: TplNode | SlotSelection;
  indent: number;
  visibility: TplVisibility;
  isHidden: boolean;
  ancestorHidden: boolean;
  componentFrameNum: number;
  ownerTplComponent: TplComponent;
  isLeaf: boolean;
  ancestorLocked: boolean;
  parentKey: OutlineNodeKey | undefined;
}

export interface OutlineNode {
  self: OutlineNodeData;
  children: OutlineNode[];
}

export class OutlineCtx {
  private visible = observable.set<string>();
  private expanded = observable.map<OutlineNodeKey, boolean>();
  private _query = observable.box("");
  private _matcher: IObservableValue<Matcher>;

  viewCtx = computedFn(() => this.studioCtx.focusedOrFirstViewCtx());

  rootTreeNode = computedFn(() => {
    const vc = this.viewCtx();
    if (!vc) {
      return null;
    }
    return makeFrameRootNode(vc, this);
  });

  rootNodeKey = computedFn(() => {
    const vc = this.viewCtx();
    if (!vc) {
      return null;
    }
    return makeNodeKey(vc.component.tplTree);
  });

  focusedNodeKeyPath = computedFn(() => {
    const vc = this.viewCtx();
    if (!vc) {
      return [];
    }

    const focusedSelectable = vc.focusedSelectable();
    const focusedTplOrSlotSelection = focusedSelectable
      ? asTplOrSlotSelection(focusedSelectable)
      : vc.focusedTpl();

    return getNodeKeyPath(vc, focusedTplOrSlotSelection);
  });

  hoveredNodeKeyPath = computedFn(() => {
    const vc = this.viewCtx();
    if (!vc) {
      return [];
    }

    const hoveredSelectable = vc.hoveredSelectable();
    if (!hoveredSelectable) {
      return [];
    }

    const tplOrSlotSelection = asTplOrSlotSelection(hoveredSelectable);
    if (!isTplAttachedToSite(this.studioCtx.site, asTpl(tplOrSlotSelection))) {
      // It is possible that whatever we had been hovering on has been detached
      // from the tree, but we haven't updated vc.hoveredSelectable() yet because
      // we're not done evaluating.
      return [];
    }

    return getNodeKeyPath(vc, tplOrSlotSelection);
  });

  private disposals: (() => void)[] = [];

  constructor(private studioCtx: StudioCtx, query: string) {
    const matcher = new Matcher(query);
    this._matcher = observable.box(matcher);
    this._query.set(query);
    this.fillVisibleSet();

    this.disposals.push(
      autorun(
        () => {
          const focusedNodeKeyPath = this.focusedNodeKeyPath();
          if (focusedNodeKeyPath.length > 0) {
            for (const key of focusedNodeKeyPath) {
              this.expanded.set(key, true);
            }
          }
        },
        {
          name: "OutlineCtx.expandAncestorsOfFocused",
        }
      ),
      // We track the focused element to clear the search whenever we change
      // the focus to a non-visible element
      reaction(
        () => this.focusedNodeKeyPath()[0],
        (focusedKey) => {
          if (this.hasQuery() && focusedKey && !this.isVisible(focusedKey)) {
            this.clearQuery();
          }
        },
        {
          name: "OutlineCtx.clearQueryIfFocusedNotVisible",
        }
      )
    );
  }

  dispose() {
    this.disposals.forEach((d) => d());
  }

  isVisible(key: OutlineNodeKey) {
    if (!this.hasQuery()) {
      return true;
    }
    return this.visible.has(key);
  }

  /**
   * Open/close state behavior:
   * - Frames share open/close state within an arena.
   * - Elements default to closed.
   * - Elements can be manually opened or closed from the outline.
   * - If there's a search query, open all elements.
   * - If an element is hovered, open all its ancestors (except itself), until unhovered.
   * - If an element is focused, open all its ancestors and itself, until manually closed.
   */
  isExpanded(key: OutlineNodeKey) {
    if (this.hasQuery()) {
      return true;
    }

    if (key === this.rootNodeKey()) {
      return true;
    }

    // Search from index 1 to only open hovered element's ancestors and NOT itself.
    const isAncestorOfHovered = this.hoveredNodeKeyPath().indexOf(key, 1) >= 1;
    if (isAncestorOfHovered) {
      return true;
    }

    return this.expanded.get(key) ?? false;
  }

  setExpanded(key: OutlineNodeKey, value: boolean) {
    this.expanded.set(key, value);
  }

  expandAll() {
    runInAction(() => {
      const tree = this.rootTreeNode();
      if (tree) {
        this.expandTree(tree);
      }
    });
  }

  private expandTree(tree: OutlineNode) {
    this.setExpanded(tree.self.key, true);
    tree.children.forEach((subtree) => this.expandTree(subtree));
  }

  collapseAll() {
    this.expanded.clear();
  }

  get query() {
    return this._query.get();
  }

  get matcher() {
    return this._matcher.get();
  }

  setQuery(query: string) {
    this._query.set(query);
    this.updateVisible();
  }

  clearQuery() {
    this.setQuery("");
  }

  private updateVisible = debounce(() => {
    runInAction(() => {
      this._matcher.set(new Matcher(this.query));
      this.fillVisibleSet();
    });
  }, 300);

  hasQuery() {
    return this.query.trim() !== "";
  }

  private fillVisibleSet() {
    this.visible.clear();
    if (!this.hasQuery()) {
      return;
    }
    const matcher = this.matcher;
    const commentsData = this.studioCtx.commentsData;

    for (const viewCtx of this.studioCtx.viewCtxs) {
      // This lets us walk up the Tpl ancestor path, but making jumps across
      // component boundaries per the current val component tree.
      // TODO This breaks if there are recursive instances of a component.
      const tplRootToParentTplComponent = new Map(
        viewCtx.currentComponentCtx() != null
          ? viewCtx
              .ancestorComponents(
                ensure(
                  viewCtx.currentComponentCtx(),
                  "ComponentCtx must exist"
                ).valComponent()
              )
              .map(
                (valComponent) =>
                  tuple(
                    valComponent.tpl.component.tplTree,
                    valComponent.tpl
                  ) as [TplNode, TplComponent]
              )
          : []
      );

      // TODO note this is somewhat wasteful for pages since tplSysRoot and
      // tplUserRoot both lead next code block to process top-level tpl tree.
      const tplRoots = tuple(viewCtx.tplSysRoot(), viewCtx.tplUserRoot());
      // This is to help us track which slot any particular child belongs to.
      const tplToSlotArg = new Map();
      // We always want to show nodes that match the typeahead, but also all their
      // ancestors.  The former we call "anchors."
      const visibleAnchors = Immutable.Set(
        (function* () {
          for (const _tplRoot of [
            ...[
              ...new Set([
                ...[...tplRoots],
                ...Array.from(Array.from(tplRootToParentTplComponent.keys())),
              ]),
            ],
          ]) {
            const tpls = Tpls.flattenTpls(_tplRoot);
            // This part is to build tplToSlotArg, not visibleAnchors.
            for (const tpl of tpls) {
              if (isKnownTplComponent(tpl)) {
                const args = viewCtx
                  .variantTplMgr()
                  .effectiveVariantSetting(tpl).args;
                for (const arg of args) {
                  if (isKnownRenderExpr(arg.expr)) {
                    for (const child of [...arg.expr.tpl]) {
                      tplToSlotArg.set(child, { tpl, arg });
                    }
                  }
                }
              }
            }
            // This part is for visibleAnchors.
            for (const tpl of [...tpls]) {
              const vs = isTplTagOrComponent(tpl)
                ? viewCtx.variantTplMgr().effectiveVariantSetting(tpl)
                : undefined;
              if (
                Array.from(
                  getSearchableTexts(tpl, viewCtx, commentsData, vs)
                ).some((t) => matcher.matches(t))
              ) {
                yield tpl;
              }
              if (isKnownTplComponent(tpl)) {
                for (const param of [...getSlotParams(tpl.component)]) {
                  if (matcher.matches(summarizeSlotParam(param))) {
                    yield new SlotSelection({
                      tpl,
                      slotParam: param,
                    });
                  }
                }
              }
            }
          }
        })()
      );

      for (const anchor_ of [...[...(visibleAnchors as any)]]) {
        let anchor: TplComponent;
        if (anchor_ instanceof SlotSelection) {
          this.visible.add(makeNodeKey(anchor_));
          anchor = ensure(anchor_.tpl, "SlotSelection.tpl must exist");
        } else {
          anchor = anchor_;
        }
        while (true) {
          let ancestor: TplNode | undefined = undefined;
          // This can be short-circuited whenever we encounter an ancestor we've
          // previously visited, rather than visiting all ancestors.
          for (ancestor of [...Tpls.ancestors(anchor).reverse()]) {
            this.visible.add(makeNodeKey(ancestor));
            // Most of the time, children of a component are specifically arguments
            // passed to the "children" slot, but if there are other slots, we want
            // to make those visible in the outline as well.
            const slotArg = tplToSlotArg.get(ancestor);
            if (slotArg != null) {
              let arg;
              ({ tpl: anchor, arg } = slotArg);
              this.visible.add(
                makeNodeKey(
                  new SlotSelection({
                    tpl: anchor,
                    slotParam: arg.param,
                  })
                )
              );
            }
          }
          // If we are drilled into some component, make the jump up to the outer
          // component context.
          const nextAnchor = tplRootToParentTplComponent.get(
            ensure(ancestor, "ancestor must exist here")
          );
          if (!nextAnchor) {
            break;
          }
          anchor = nextAnchor;
        }
      }
    }
  }
}

function* getSearchableTexts(
  tpl: TplNode,
  viewCtx: ViewCtx,
  commentsData: CommentsData,
  vs?: EffectiveVariantSetting
) {
  if (Tpls.isTplRepeated(tpl)) {
    yield REPEATED_CAP;
  }

  if (Tpls.hasEventHandlers(tpl)) {
    yield INTERACTIVE_CAP;
  }

  if (isElementWithComments(commentsData, tpl)) {
    yield COMMENTS_LOWER;
  }

  if (Tpls.isTplNamable(tpl) && tpl.name) {
    yield tpl.name;
  }
  if (Tpls.isTplTextBlock(tpl)) {
    const content = Tpls.getTplTextBlockContent(tpl, viewCtx);
    if (content) {
      yield content;
    } else {
      yield getNodeSummary(tpl, vs?.rsh());
    }
  } else {
    yield getNodeSummary(tpl, vs?.rsh());
  }
}

export function getNodeSummary(node: TplNode, rsh?: ReadonlyIRuleSetHelpersX) {
  if (isTplImage(node)) {
    const asset = getOnlyAssetRef(node);
    if (asset) {
      return asset.name;
    }
  }
  return Tpls.summarizeTpl(node, rsh);
}

export function makeNodeKey(
  tpl: TplNode | SlotSelection | ArenaFrame
): OutlineNodeKey {
  if (isKnownArenaFrame(tpl)) {
    return toOpaque(`${tpl.uid}`);
  } else if (tpl instanceof SlotSelection) {
    return toOpaque(
      `${
        ensure(tpl.toTplSlotSelection().tpl, "SlotSelection.tpl must exist").uid
      }-${tpl.slotParam.uid}`
    );
  } else {
    return toOpaque(`${tpl.uid}`);
  }
}

function getNodeKeyPath(
  vc: ViewCtx,
  tplOrSelection: TplNode | SlotSelection | null
): OutlineNodeKey[] {
  const frame = vc.arenaFrame();

  if (!tplOrSelection) {
    return [makeNodeKey(frame)];
  }
  const isHiddenRoot =
    tplOrSelection === vc.component.tplTree &&
    vc.arenaFrame().viewMode === FrameViewMode.Stretch;

  if (isHiddenRoot) {
    return [makeNodeKey(frame)];
  }

  const ancestors = $$$(tplOrSelection).ancestorsWithSlotSelections().toArray();

  const curCtxAncestors = vc
    .componentStackFrames()
    .slice(1)
    .flatMap((f) =>
      $$$(f.tplComponent).ancestorsWithSlotSelections().toArray()
    );

  return [...ancestors, ...curCtxAncestors, frame].map(makeNodeKey);
}

function makeFrameRootNode(viewCtx: ViewCtx, outlineCtx: OutlineCtx) {
  const frame = viewCtx.arenaFrame();
  const key = makeNodeKey(frame);
  const root = viewCtx.tplUserRoot();
  const ownerTplComponent = viewCtx.tplSysRoot();
  return makeNode(
    /*node*/ root,
    viewCtx,
    outlineCtx,
    /*indent*/ 0,
    /*ancestorHidden*/ false,
    /*ancestorLocked*/ false,
    ownerTplComponent,
    /*componentFrameNum*/ 0,
    /*parentKey*/ key
  );
}

function makeNode(
  node: TplNode | SlotSelection,
  viewCtx: ViewCtx,
  outlineCtx: OutlineCtx,
  indent: number,
  ancestorHidden: boolean,
  ancestorLocked: boolean,
  ownerTplComponent: TplComponent,
  componentFrameNum: number,
  parentKey: OutlineNodeKey | undefined
): OutlineNode | undefined {
  const effectiveVs = computed(
    () =>
      isTplTagOrComponent(node)
        ? viewCtx.variantTplMgr().effectiveVariantSetting(node)
        : undefined,
    { name: "TreeNode.effectiveVs" }
  );

  const visibility = getTreeNodeVisibility(viewCtx, node);
  const isHidden = computed(
    () => {
      const visibilityDataCond = effectiveVs.get()?.dataCond;
      return isVisibilityHidden(
        visibility,
        visibilityDataCond,
        () =>
          isKnownTplNode(node) ? viewCtx.getCanvasEnvForTpl(node) : undefined,
        {
          projectFlags: viewCtx.projectFlags(),
          component: ownerTplComponent.component,
          inStudio: true,
        }
      );
    },
    {
      name: "TreeNode.isHidden",
    }
  ).get();

  const { children, childrenFrameNum } = getTreeNodeChildren(
    viewCtx,
    node,
    componentFrameNum,
    ownerTplComponent
  );

  const self: OutlineNodeData = {
    key: makeNodeKey(node),
    item: node,
    indent,
    visibility,
    isHidden,
    ancestorHidden,
    ownerTplComponent,
    componentFrameNum,
    isLeaf: children.length === 0,
    ancestorLocked,
    parentKey,
  };

  // When we encounter a descendant TplSlot, we may show either the arg for that slot,
  // or the default contents for that slot.  "Usually" we would show the default contents,
  // but when we are in spotlight mode, and not showingDefaultSlotContents, we would want
  // to show the arg content corresponding to that slot for the TplComponent.  This
  // ownerTplComponent is the TplComponent where we can look for the arg.  It starts
  // out as tplSysRoot(), and as we descend and encouter the TplComponent that we are
  // drilled into, we switch to that as the ownerTplComponent.
  const childrenOwnerTplComponent =
    isKnownTplComponent(node) &&
    viewCtx.componentStackFrames().find((sf) => sf.tplComponent === node)
      ? node
      : ownerTplComponent;

  const childrenNodes = withoutNils(
    children.map((child) => {
      const _ancestorLocked =
        isKnownTplNode(node) && node.locked === false
          ? false
          : isKnownTplNode(node) && node.locked === true
          ? true
          : ancestorLocked;

      return makeNode(
        /*node*/ child,
        viewCtx,
        outlineCtx,
        /*indent*/ indent + 1,
        /*ancestorHidden*/ isHidden || ancestorHidden,
        _ancestorLocked,
        /*ownerTplComponent*/ childrenOwnerTplComponent,
        /*componentFrameNum*/ childrenFrameNum,
        /*parentKey*/ self.key
      );
    })
  );

  return {
    self,
    children: childrenNodes,
  };
}

export function getTreeNodeVisibility(
  viewCtx: ViewCtx,
  node: TplNode | SlotSelection
) {
  if (node instanceof SlotSelection) {
    const tplComponent = node.getTpl();
    const component = tplComponent.component;
    const tplSlot = getTplSlotForParam(component, node.slotParam);
    if (!tplSlot) {
      return TplVisibility.Visible;
    }
    return isTplSlotVisible(
      component,
      tplSlot,
      getTplComponentActiveVariants(
        tplComponent,
        viewCtx.variantTplMgr().getEffectiveVariantComboForNode(tplComponent)
      )
    );
  } else if (Tpls.isTplVariantable(node)) {
    return viewCtx.getViewOps().getEffectiveTplVisibility(node);
  } else {
    return TplVisibility.Visible;
  }
}

/**
 * Returns children tree nodes and the children ComponentFrame to use.
 */
const getTreeNodeChildren = computedFn(
  function _getTreeNodeChildren(
    viewCtx: ViewCtx,
    item: TplNode | SlotSelection,
    componentFrameNum: number,
    ownerTplComponent: TplComponent
  ): { children: (TplNode | SlotSelection)[]; childrenFrameNum: number } {
    return switchType(item)
      .when(TplTag, (tpl) => {
        const childrenFrameNum = componentFrameNum;
        if (!Tpls.isTplTextBlock(tpl)) {
          return {
            children: $$$(tpl).children().toArrayOfTplNodes(),
            childrenFrameNum,
          };
        }

        const vs = viewCtx.effectiveCurrentVariantSetting(tpl);
        if (!isKnownRawText(vs.text)) {
          return { children: [], childrenFrameNum };
        }

        const visibleChildren = filterMapTruthy(
          vs.text.markers,
          (m) => isKnownNodeMarker(m) && m.tpl
        );
        return { children: visibleChildren, childrenFrameNum };
      })
      .when(TplComponent, (tpl) => {
        const isAncestorComponentOfFocus = viewCtx
          .componentStackFrames()
          .map((f) => f.tplComponent)
          .includes(tpl);
        if (isAncestorComponentOfFocus) {
          // We are currently in spotlight mode, so the tplComponents on the spotlight
          // stack should all be rendering the innards of the Component, and not the
          // Slot args
          return {
            children: [tpl.component.tplTree],
            childrenFrameNum: componentFrameNum + 1,
          };
        }
        // Otherwise, we render the slots and their args as children of TplComponent
        let slotParams = getCachedSlotParams(tpl.component);
        const plumePlugin = getPlumeEditorPlugin(tpl.component);
        if (plumePlugin && plumePlugin.shouldShowInstanceProp) {
          slotParams = slotParams.filter((p) =>
            plumePlugin.shouldShowInstanceProp!(tpl, p)
          );
        }
        const meta = viewCtx.studioCtx.getCodeComponentMeta(tpl.component);
        if (isCodeComponent(tpl.component) && meta) {
          const valComps = viewCtx.maybeTpl2ValsInContext(tpl);
          if (valComps && valComps.length > 0) {
            const valComp = valComps[0] as ValComponent;
            const valCompProps = valComp.codeComponentProps;
            const ccContextData = viewCtx.getContextData(valComp);
            slotParams = slotParams.filter((p) => {
              const propType = meta.props[p.variable.name];
              if (
                isPlainObjectPropType(propType) &&
                propType.type === "slot" &&
                (propType as any).hidden
              ) {
                return !(propType as any).hidden(valCompProps, ccContextData);
              }
              return true;
            });
          } else {
            slotParams = slotParams.filter((p) => {
              const propType = meta.props[p.variable.name];
              return !isPlainObjectPropType(propType) || !propType.hidden;
            });
          }
        }
        return {
          children: slotParams.map(
            (slotParam) => new SlotSelection({ tpl, slotParam })
          ),
          childrenFrameNum: componentFrameNum,
        };
      })
      .when(SlotSelection, (ss) => {
        return {
          children: eagerCoalesce(
            maybe(
              $$$(
                ensure(
                  ss.toTplSlotSelection().tpl,
                  "SlotSelection is expected to have a tpl"
                )
              ).getSlotArg(ss.slotParam.variable.name),
              (arg) => ensureKnownRenderExpr(arg.expr).tpl
            ),
            []
          ),
          childrenFrameNum: componentFrameNum,
        };
      })
      .when(TplSlot, (slot) => {
        // We show the slot args passed in from outside the component this
        // slot is part of.
        //
        // Note that this is limited to just showing a RenderExpr that is
        // directly passed in.
        //
        // If the slot were passed an arg via a CustomCode (not a RenderExpr)
        // that is forwarding slot args passed into an outer component, we
        // aren't currently able to show that (even if it ultimately
        // originated from a RenderExpr).  We probably need more source
        // infrastructure---all a slot is given is some CustomCode expr
        // passing in ValNodes---you'd need to look at the ValNode tpl
        // pointers and locate those, but that would only work if there are
        // any ValNodes (TplNodes could have conditionally rendered into
        // nothing).
        //
        // We could alternatively render defaultContents when we're ready to
        // tackle that.
        //
        // To determine the RenderExpr, we need val info.  Consider:
        //
        // A =
        //   <Framer>
        //     <B>
        //
        // B =
        //   <Framer>
        //     <C>
        //
        // Framer =
        //   <div>     <-- say this is the current tpl
        //     <slot>  <-- what should children be? depends which Framer inst!
        //
        // Framer could be called from anywhere, so we need to rely on val
        // info to know which call and what args were passed in.
        //
        // However, recursion so far only is tracking tpl, not val.
        //
        // We need to pass down the val info as well, or we could just pass
        // down the owner (somewhat replicating componentAncestors()).
        const arg = viewCtx
          .variantTplMgr()
          .getEffectiveArgForParam(ownerTplComponent, slot.param);

        const shouldShowDefaultSlotContents =
          viewCtx.showingDefaultSlotContentsFor(ownerTplComponent);

        const slotContents = shouldShowDefaultSlotContents
          ? slot.defaultContents
          : arg
          ? ensureKnownRenderExpr(arg.expr).tpl
          : [];

        return {
          children:
            slotContents.length === 1 &&
            isTplPlainText(slotContents[0]) &&
            !isCodeComponent(ownerTplComponent.component)
              ? []
              : slotContents,
          childrenFrameNum: shouldShowDefaultSlotContents
            ? componentFrameNum
            : componentFrameNum - 1,
        };
      })
      .result();
  },
  { name: "getTreeNodeChildren()" }
);

const getCachedSlotParams = computedFn(
  function getCachedSlotParams(component: Component) {
    return getSlotParams(component);
  },
  {
    name: "getCachedSlotParams",
    keepAlive: true,
  }
);
