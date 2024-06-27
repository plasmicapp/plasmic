import {
  ViewCtx,
  ensureBaseRs,
  ensureVariantRs,
} from "@/wab/client/studio-ctx/view-ctx";
import { assert } from "@/wab/shared/common";
import { $$$ } from "@/wab/shared/TplQuery";
import { AddItemKey } from "@/wab/shared/add-item-keys";
import {
  COLUMNS_CONFIG_DEFAULTS,
  redistributeColumnsSizes,
} from "@/wab/shared/columns-utils";
import { AddItemPrefs, getSimplifiedStyles } from "@/wab/shared/default-styles";
import { ColumnsConfig, TplTag, Variant } from "@/wab/shared/model/classes";
import { clearTplVisibility } from "@/wab/shared/visibility-utils";
import { TplColumnsTag, TplTagType, isTplColumn } from "@/wab/shared/core/tpls";

export const getScreenVariant = (viewCtx: ViewCtx): Variant | undefined => {
  const screenVariants =
    viewCtx.studioCtx.site.activeScreenVariantGroup?.variants || [];
  let variant: Variant | undefined;
  if (screenVariants.length > 0) {
    variant = screenVariants[0];
  }
  return variant;
};

export function ensureTplColumnsRs(
  vc: ViewCtx,
  tag: TplTag,
  variant: Variant | undefined | null,
  isBaseColumn = false,
  styles: Record<string, string> = getSimplifiedStyles(
    AddItemKey.columns,
    vc.site.activeTheme?.addItemPrefs as AddItemPrefs | undefined
  )
) {
  ensureBaseRs(vc, tag, {
    display: "flex",
    position: "relative",
    width: "stretch",
    height: "wrap",
    alignItems: "stretch",
    flexShrink: 1,
    ...(styles ? styles : {}),
  });

  const baseTagVs = vc.variantTplMgr().ensureBaseVariantSetting(tag);
  baseTagVs.columnsConfig = new ColumnsConfig(
    isBaseColumn
      ? COLUMNS_CONFIG_DEFAULTS.mobile
      : COLUMNS_CONFIG_DEFAULTS.desktop
  );

  if (variant) {
    const variantTagVs = vc
      .variantTplMgr()
      .ensureVariantSetting(tag, [variant]);
    ensureVariantRs(vc, tag, variant, {
      width: "stretch",
      height: "wrap",
    });
    variantTagVs.columnsConfig = new ColumnsConfig(
      !isBaseColumn
        ? COLUMNS_CONFIG_DEFAULTS.mobile
        : COLUMNS_CONFIG_DEFAULTS.desktop
    );
  }
}

export function ensureTplColumnRs(
  vc: ViewCtx,
  tag: TplTag,
  styles: Record<string, string> = getSimplifiedStyles(
    AddItemKey.vstack,
    vc.site.activeTheme?.addItemPrefs as AddItemPrefs | undefined
  )
) {
  ensureBaseRs(vc, tag, {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    ...(styles ? styles : {}),
  });
}

export function makeTplColumn(
  vc: ViewCtx,
  styles: Record<string, string> = getSimplifiedStyles(
    AddItemKey.vstack,
    vc.site.activeTheme?.addItemPrefs as AddItemPrefs | undefined
  )
) {
  const tag = vc.variantTplMgr().mkTplTagX("div", { type: TplTagType.Column });
  ensureTplColumnRs(vc, tag, styles);
  return tag;
}

export const removeLastColumn = (tpl: TplColumnsTag, vc: ViewCtx) => {
  if (tpl.children.length <= 1) {
    return;
  }
  const val = tpl.children.length - 1;
  const deletedColumns = [...tpl.children.slice(val)];
  const lastColumn = tpl.children[val - 1];
  assert(isTplColumn(lastColumn), "Must be a column");
  for (const deletedColumn of deletedColumns) {
    assert(isTplColumn(deletedColumn), "Must be a column");
    [...deletedColumn.children].forEach((child) =>
      $$$(lastColumn).append(child)
    );
    $$$(deletedColumn).remove({ deep: false });
  }
  redistributeColumnsSizes(tpl, vc.variantTplMgr());
};

export const addNewColumn = (tpl: TplColumnsTag, vc: ViewCtx) => {
  if (tpl.children.length === 12) {
    return;
  }
  const childTag = makeTplColumn(vc);
  $$$(tpl).append(childTag);
  // We clear the tpl column visibility when it's added,
  // so that we don't have empty spaces by default when the
  // user is recording a variant and adding new column.
  const baseVs = vc.variantTplMgr().ensureBaseVariantSetting(tpl);
  clearTplVisibility(childTag, baseVs.variants);
  redistributeColumnsSizes(tpl, vc.variantTplMgr());
};

export const prefixSum = (arr: number[]) => {
  return arr.map((_, idx) => {
    return arr.slice(0, idx + 1).reduce((p, v) => p + v, 0);
  });
};
