import { DbCtx } from "@/wab/client/db";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { FrameViewMode } from "@/wab/shared/Arenas";
import {
  adjustAllGridChildren,
  removeAllGridChildProps,
} from "@/wab/shared/Grids";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import {
  fillVirtualSlotContents,
  findParentArgs,
  findParentSlot,
  isDefaultSlotArg,
} from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { isBaseVariant } from "@/wab/shared/Variants";
import { getActiveVariantsForFrame } from "@/wab/shared/cached-selectors";
import { notNil, tuple } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import {
  RecordedChanges,
  mergeRecordedChanges,
} from "@/wab/shared/core/observable-model";
import { isTagListContainer } from "@/wab/shared/core/rich-text-util";
import { getAllSiteFrames, isTplAttachedToSite } from "@/wab/shared/core/sites";
import {
  ensureCorrectImplicitStates,
  removeImplicitStatesAfterRemovingTplNode,
} from "@/wab/shared/core/states";
import {
  buildParamToComponent as buildParamToComponentMap,
  flattenTpls,
  getTplOwnerComponent,
  isGrid,
  isTplComponent,
  isTplContainer,
  isTplTag,
  isTplTagOrComponent,
  isTplVariantable,
  tryGetOwnerSite,
} from "@/wab/shared/core/tpls";
import {
  Arg,
  RenderExpr,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  isKnownTplComponent,
  isKnownTplSlot,
  isKnownVirtualRenderExpr,
} from "@/wab/shared/model/classes";
import {
  ChangeSummary,
  summarizeChanges,
} from "@/wab/shared/model/model-change-util";
import { fixupForPlume } from "@/wab/shared/plume/plume-utils";
import { isStretchyComponent } from "@/wab/shared/sizingutils";

/**
 * Applies various fixes to the tpl trees based on the argument changes.
 * These should be fixes that do not effect the integrity of the
 * model tree (and therefore can be delayed until after change() functions
 * have been run).
 */
export function fixupForChanges(
  studioCtx: StudioCtx,
  changes: RecordedChanges
) {
  let summary = summarizeChanges(studioCtx, changes);

  const applyFix = (f: () => void) => {
    const subchanges = studioCtx.recorder.withRecording(f);
    const newChanges = mergeRecordedChanges(changes, subchanges);
    const newSummary = summarizeChanges(studioCtx, newChanges);
    return tuple(newChanges, newSummary);
  };

  if (changes.changes.length > 0) {
    // Do model-related fixes
    [changes, summary] = applyFix(() =>
      fixupVirtualSlotArgs(studioCtx.dbCtx(), studioCtx.tplMgr(), summary)
    );

    [changes, summary] = applyFix(() =>
      fixupForPlume(summary, studioCtx.focusedViewCtx())
    );

    [changes, summary] = applyFix(() => fixupGridChildren(summary));

    [changes, summary] = applyFix(() => {
      fixupBaseVariantSettings(studioCtx.tplMgr(), summary);
      fixupFrameViewModeByRootSize(studioCtx.site);
    });

    [changes, summary] = applyFix(() => {
      fixupTextTags(summary);
    });

    [changes, summary] = applyFix(() => {
      fixupIncorrectlyNamedNodes(summary, studioCtx);
      fixupImplicitStates(summary);
    });
  }

  // Now do view-related fixes

  [changes, summary] = applyFix(() => {
    // Before we perform any fixes from view state, we make sure that
    // we only have valid ViewCtxs
    studioCtx.pruneInvalidViewCtxs();

    // Remove any stale references to non-existent frames
    fixupFocusedFrameIfRemoved(studioCtx);

    fixupChrome(studioCtx);
  });

  return tuple(changes, summary);
}

function fixupFocusedFrameIfRemoved(studioCtx: StudioCtx) {
  const frame = studioCtx.focusedFrame();
  if (frame && !getAllSiteFrames(studioCtx.site).includes(frame)) {
    studioCtx.setStudioFocusOnFrame({ frame: undefined });
  }
}

function fixupFrameViewModeByRootSize(site: Site) {
  for (const frame of getAllSiteFrames(site)) {
    if (
      isPageComponent(frame.container.component) &&
      frame.viewMode != FrameViewMode.Stretch
    ) {
      // Page component frames should always be stretched!
      frame.viewMode = FrameViewMode.Stretch;
      const root = frame.container.component.tplTree;
      if (isTplVariantable(root)) {
        for (const vs of root.vsettings) {
          const expr = RSH(vs.rs, root);
          if (isBaseVariant(vs.variants)) {
            expr.set("width", "stretch");
            expr.set("height", "stretch");
          } else {
            expr.clear("width");
            expr.clear("height");
          }
        }
      }
    } else if (frame.viewMode === FrameViewMode.Stretch) {
      // To remain in stretch mode, then only width must be "stretchy"
      const activeVariants = getActiveVariantsForFrame(site, frame);

      if (!isStretchyComponent(frame.container.component, activeVariants)) {
        frame.viewMode = FrameViewMode.Centered;
      }
    }
  }
}

/**
 * Ensures all new TplNodes have a base variant setting
 */
function fixupBaseVariantSettings(tplMgr: TplMgr, summary: ChangeSummary) {
  for (const tree of summary.newTrees) {
    for (const node of flattenTpls(tree)) {
      if (isTplTagOrComponent(node)) {
        tplMgr.ensureBaseVariantSetting(node);
      }
    }
  }
}

/**
 * Ensures all Grid tags will have children with appropriate grid css styles
 */
function fixupGridChildren(summary: ChangeSummary) {
  function fixupGridProps(tag: TplNode) {
    // If the tag isn't a grid and is a tag we check if it's a container and remove
    // all grid props from the children
    if (!isGrid(tag) && isTplContainer(tag)) {
      removeAllGridChildProps(tag);
    }

    // If we updated a grid we try to validate the children to change
    // the width, height and convert to relative positioning
    if (isGrid(tag)) {
      adjustAllGridChildren(tag);
    }
  }

  for (const tree of summary.newTrees) {
    for (const tag of flattenTpls(tree)) {
      if (isTplVariantable(tag)) {
        fixupGridProps(tag);
      }
    }
  }

  for (const node of summary.updatedNodes) {
    if (isTplVariantable(node)) {
      fixupGridProps(node);
    }
  }
}

/**
 * Fills in commonly expected parts of the model that are expected by the UI
 * chrome, like the currently focused VariantSetting.
 */
export function fixupChrome(studioCtx: StudioCtx) {
  const focusedViewCtx = studioCtx.focusedViewCtx();
  if (focusedViewCtx) {
    const focusedTpl = focusedViewCtx.focusedTpl();
    if (isTplVariantable(focusedTpl)) {
      focusedViewCtx.variantTplMgr().ensureCurrentVariantSetting(focusedTpl);
    }
  }
}

function fixupTextTags(summary: ChangeSummary) {
  for (const tree of summary.newTrees) {
    for (const tag of flattenTpls(tree)) {
      if (
        isTplTag(tag) &&
        isTagListContainer(tag.tag) &&
        tag.children.length === 0 &&
        tag.parent
      ) {
        $$$(tag).remove({ deep: true });
      }
    }
  }

  for (const node of summary.updatedNodes) {
    if (
      isTplTag(node) &&
      isTagListContainer(node.tag) &&
      node.children.length === 0 &&
      node.parent // we may have nodes that aren't attached
    ) {
      $$$(node).remove({ deep: true });
    }
  }
}

// Make sure all names contained within `newItem` will not conflict with existing names
// and that components with public states will receive a name
function fixupIncorrectlyNamedNodes(
  summary: ChangeSummary,
  studioCtx: StudioCtx
) {
  for (const tree of summary.newTrees) {
    const tplMgr = studioCtx.tplMgr();
    const ownerComponent = getTplOwnerComponent(tree);
    tplMgr.ensureSubtreeCorrectlyNamed(ownerComponent, tree);
  }
}

// Ensure that all implicit states are properly exposed/removed
function fixupImplicitStates(summary: ChangeSummary) {
  for (const component of summary.deepUpdatedComponents) {
    const site = tryGetOwnerSite(component);
    if (site) {
      component.states.forEach((state) => {
        if (state.tplNode && !isTplAttachedToSite(site, state.tplNode)) {
          removeImplicitStatesAfterRemovingTplNode(
            site,
            component,
            state.tplNode
          );
        }
      });
    }
  }
  for (const tree of summary.newTrees) {
    const component = $$$(tree).tryGetOwningComponent();
    if (component) {
      const site = tryGetOwnerSite(component);
      if (site) {
        for (const node of flattenTpls(tree)) {
          if (isTplComponent(node) || isTplTag(node)) {
            ensureCorrectImplicitStates(site, component, node);
          }
        }
      }
    }
  }
}

/**
 * Given some ModelChanges, fixes up the data model related to virtual slots.  Specifically:
 *
 * * If a TplComponent has been updated / created, we fill in its slot Args with
 *   VirtualRenderExpr with a copy of the default slot contents.
 * * If a TplNode has been updated under some TplSlot.defaultContents, then we update
 *   all TplComponents with args that have a VirtualRenderExpr for the corresponding arg
 *   with a new copy of defaultContents.
 * * If a TplNode has been updated under some slot arg, and it was previously an arg with
 *   VirtualRenderExpr, then we "fork" the arg and turn it into a normal RenderExpr.
 *
 * A discussion on VirtualRenderExpr: we want TplComponents that don't have their own
 * args for slots to display the defaultContents for those slots.  To do so, we
 * instantiate args for those slots with a VirtualRenderExpr that is a copy of the
 * defaultContents for those slots.  Then, when we detect user changes to
 * the arg content, we can fork; when we detect user changes to the default contents,
 * we can sync.  It's not ideal that we are "manually" maintaining a clone of the
 * defaultContents in all these VirtualRenderExpr.  However, node editing currently
 * can happen anywhere in the app at any time for whatever reason, and so when the
 * edits happen to args that currently reflect default slot contents, we need to make sure
 * those edits don't go to the actual defaultContents TplNodes.  Therefore the
 * scheme here is to keep a clone that can absorb those edits, and then we
 * "fix up" the forking or virtual node updates here, after the change has happened.
 */
export function fixupVirtualSlotArgs(
  dbCtx: DbCtx,
  tplMgr: TplMgr,
  summary: Pick<ChangeSummary, "updatedNodes" | "newTrees">
) {
  // Gather up all the new values to see what TplSlot or TplComponent themselves
  // have been updated.
  const updatedTplSlots = new Set<TplSlot>();
  const newTplComponents = new Set<TplComponent>();

  const maybeForkArg = (arg: Arg) => {
    if (isKnownVirtualRenderExpr(arg.expr)) {
      // Fork the update!
      arg.expr = new RenderExpr({ tpl: [...arg.expr.tpl] });
    }
  };

  // If any new TplSlot or TplComponent have been attached to the model tree,
  // also track them for fixing.  We look at both newTrees and movedTrees,
  //
  for (const newTree of summary.newTrees) {
    for (const newNode of flattenTpls(newTree)) {
      if (isKnownTplSlot(newNode)) {
        updatedTplSlots.add(newNode);
      } else if (isKnownTplComponent(newNode)) {
        newTplComponents.add(newNode);
      }
    }
  }

  // From summary.updatedNodes, see if any TplNodes that belong to a TplSlot
  // or TplComponent.args have been updated.  We look at summary.updatedNodes
  // and also summary.movedTrees, because we may have a tpl that was moved from
  // a VirtualRenderExpr to a RenderExpr (via a fork), which would only show up
  // in movedTrees; we want to detect the correspondingly affected parent arg
  // in that case.
  for (const node of [...summary.updatedNodes]) {
    if (isKnownTplSlot(node)) {
      updatedTplSlots.add(node);
    } else {
      const parentArgs = findParentArgs(node);
      if (parentArgs.length > 0) {
        // changed `node` is a part of some TplComponent slot arg;
        // we might need to fork the arg content
        for (const parentArg of parentArgs) {
          maybeForkArg(parentArg.arg);
        }
      }
      const parentSlot = findParentSlot(node);
      if (parentSlot) {
        // changed `node` is a part of some slot default content
        updatedTplSlots.add(parentSlot);
      }
    }
  }

  // For each new TplComponent, we fill in VirualRenderExpr args for
  // slots with defaultContents. We do this before we fix up the TplComponents
  // affected by updatedTplSlots, because some of those updatedTplSlots may
  // contain one of these newTplComponents, and they need to have their virtual
  // contents filled in first before they are copied to affected TplComponents
  dbCtx.maybeObserveComponents(
    Array.from(newTplComponents).map((tpl) => $$$(tpl).owningComponent())
  );
  for (const tplc of newTplComponents) {
    fillVirtualSlotContents(tplMgr, tplc);
  }

  if (updatedTplSlots.size > 0) {
    // For each updated TplSlot (defaultContents have changed), we
    // update all TplComponents with a VirtualRenderExpr for this slot
    const allTplComponents = tplMgr.filterAllNodes(isTplComponent);
    const param2Components = buildParamToComponentMap(tplMgr.getComponents());
    const affectedComponents = new Set(
      Array.from(updatedTplSlots)
        .map((slot) => param2Components.get(slot.param))
        .filter(notNil)
    );
    const affectedTplComponents = allTplComponents.filter((tplc) => {
      if (!affectedComponents.has(tplc.component)) {
        return false;
      }
      const slots = Array.from(updatedTplSlots).filter((slot) =>
        tplc.component.params.includes(slot.param)
      );
      for (const slot of slots) {
        const arg = $$$(tplc).getSlotArgForParam(slot.param);
        if (isDefaultSlotArg(arg)) {
          return true;
        }
      }
      return false;
    });
    dbCtx.maybeObserveComponents(
      affectedTplComponents.map((tpl) => $$$(tpl).owningComponent())
    );
    for (const tplc of affectedTplComponents) {
      const slots = Array.from(updatedTplSlots).filter((slot) =>
        tplc.component.params.includes(slot.param)
      );
      fillVirtualSlotContents(tplMgr, tplc, slots);
    }
  }
}
