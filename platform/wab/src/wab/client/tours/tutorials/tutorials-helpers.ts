import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import {
  AddTplItem,
  INSERTABLES_MAP,
} from "@/wab/client/definitions/insertables";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { AddItemKey } from "@/wab/shared/add-item-keys";
import { waitUntil } from "@/wab/shared/common";
import { flattenTpls } from "@/wab/shared/core/tpls";
import { isKnownTplSlot } from "@/wab/shared/model/classes";

export async function addTextElement(studioCtx: StudioCtx) {
  const vc = studioCtx.focusedOrFirstViewCtx();
  if (!vc) {
    throw new Error("Missing view context");
  }
  const tplTree = vc.arenaFrame().container.component.tplTree;
  const target = flattenTpls(tplTree).find(
    (tpl) => !isKnownTplSlot(tpl) && tpl.name === "mainTextContainer"
  );
  await studioCtx.change(({ success }) => {
    vc.viewOps.tryInsertInsertableSpec(
      INSERTABLES_MAP[AddItemKey.text] as AddTplItem,
      InsertRelLoc.append,
      undefined,
      target
    );
    return success();
  });

  studioCtx.setShowAddDrawer(false);
}

export function isVisible(selector: string) {
  const element = document.querySelector(selector);
  if (!element) {
    return false;
  }
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.display === "none") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

const VISIBILITY_MAX_WAIT = 1000 * 30; // 30 seconds

export async function waitElementToBeVisible(selector: string) {
  await waitUntil(() => isVisible(selector), {
    maxTimeout: VISIBILITY_MAX_WAIT,
  });
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
