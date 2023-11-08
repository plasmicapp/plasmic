import { Site, TplNode } from "../classes";
import { tuple } from "../common";
import { isPageComponent } from "../components";
import { ChangeSummary, summarizeChanges } from "../model-change-util";
import { mergeRecordedChanges, RecordedChanges } from "../observable-model";
import { FrameViewMode } from "../shared/Arenas";
import { getActiveVariantsForFrame } from "../shared/cached-selectors";
import { isTagListContainer } from "../shared/core/rich-text-util";
import {
  adjustAllGridChildren,
  removeAllGridChildProps,
} from "../shared/Grids";
import { fixupForPlume } from "../shared/plume/plume-utils";
import { RSH } from "../shared/RuleSetHelpers";
import { isStretchyComponent } from "../shared/sizingutils";
import { fixupVirtualSlotArgs } from "../shared/SlotUtils";
import { TplMgr } from "../shared/TplMgr";
import { $$$ } from "../shared/TplQuery";
import { isBaseVariant } from "../shared/Variants";
import { getAllSiteFrames } from "../sites";
import { ensureCorrectImplicitStates } from "../states";
import {
  flattenTpls,
  getTplOwnerComponent,
  isGrid,
  isTplComponent,
  isTplContainer,
  isTplTag,
  isTplTagOrComponent,
  isTplVariantable,
  tryGetOwnerSite,
} from "../tpls";
import { StudioCtx } from "./studio-ctx/StudioCtx";

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
      fixupVirtualSlotArgs(studioCtx.tplMgr(), summary)
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

// Ensure that all implicit states are properly exposed
function fixupImplicitStates(summary: ChangeSummary) {
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
