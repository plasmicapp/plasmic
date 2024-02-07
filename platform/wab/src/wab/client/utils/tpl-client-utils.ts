import { TplNode } from "@/wab/classes";
import { isTplCodeComponentStyleable } from "@/wab/client/code-components/code-components";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { switchType } from "@/wab/common";
import { isCodeComponent } from "@/wab/components";
import { isPlainObjectPropType } from "@/wab/shared/code-components/code-components";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import {
  ContainerLayoutType,
  getRshContainerType,
} from "@/wab/shared/layoututils";
import { TplVisibility } from "@/wab/shared/visibility-utils";
import { SlotSelection } from "@/wab/slots";
import {
  isTplCodeComponent,
  isTplNamable,
  isTplSlot,
  isTplTagOrComponent,
  isTplVariantable,
  summarizeSlotParam,
  summarizeTpl,
} from "@/wab/tpls";
import { ValNode } from "@/wab/val-nodes";
import { FocusObj } from "@/wab/vals";

export function getVisibilityChoicesForTpl(viewCtx: ViewCtx, tpl: TplNode) {
  if (isTplVariantable(tpl)) {
    return [
      TplVisibility.Visible,
      ...(canSetDisplayNone(viewCtx, tpl) ? [TplVisibility.DisplayNone] : []),
      TplVisibility.NotRendered,
      TplVisibility.CustomExpr,
    ];
  }

  return [];
}

export function canSetDisplayNone(viewCtx: ViewCtx, tpl: TplNode) {
  return (
    !isTplSlot(tpl) &&
    !(isTplCodeComponent(tpl) && !isTplCodeComponentStyleable(viewCtx, tpl))
  );
}

export function getSlotSelectionDisplayName(
  sel: SlotSelection,
  viewCtx?: ViewCtx
) {
  const component = sel.getTpl().component;
  const param = sel.slotParam;
  if (isCodeComponent(component) && viewCtx) {
    const meta = viewCtx.getCodeComponentMeta(component);
    const propType = meta?.props[param.variable.name];
    if (
      propType &&
      isPlainObjectPropType(propType) &&
      propType.type === "slot" &&
      (propType as any).displayName
    ) {
      return `Slot: ${(propType as any).displayName}`;
    }
  }
  return summarizeSlotParam(param);
}

export function summarizeFocusObj(
  obj: FocusObj,
  viewCtx?: ViewCtx,
  vs?: EffectiveVariantSetting
): string {
  return switchType(obj)
    .when(SlotSelection, (vp: /*TWZ*/ SlotSelection) =>
      getSlotSelectionDisplayName(vp, viewCtx)
    )
    .when(ValNode, (val) => {
      if (!vs && isTplVariantable(val.tpl)) {
        vs = viewCtx?.effectiveCurrentVariantSetting(val.tpl);
      }
      const summary = summarizeTpl(val.tpl, vs?.rsh());
      if (isTplNamable(val.tpl) && val.tpl.name) {
        return `${val.tpl.name} (${summary})`;
      } else {
        return summary;
      }
    })
    .result();
}

export function getContainerType(tplNode?: TplNode | null, viewCtx?: ViewCtx) {
  if (!tplNode) {
    return undefined;
  }

  const variantSetting =
    isTplTagOrComponent(tplNode) &&
    viewCtx?.effectiveCurrentVariantSetting(tplNode);

  const rulesetHelper = variantSetting && variantSetting.rsh();

  if (!rulesetHelper) {
    return undefined;
  }

  return getRshContainerType(rulesetHelper);
}

export function isFlexContainer(tplNode?: TplNode | null, viewCtx?: ViewCtx) {
  return [ContainerLayoutType.flexRow, ContainerLayoutType.flexColumn].includes(
    getContainerType(tplNode, viewCtx) as any
  );
}
