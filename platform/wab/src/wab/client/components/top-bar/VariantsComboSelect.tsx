import { usePreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import VariantsMenu from "@/wab/client/components/top-bar/VariantsMenu";
import {
  DefaultVariantsComboSelectProps,
  PlasmicVariantsComboSelect,
} from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicVariantsComboSelect";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, partitions, xGroupBy } from "@/wab/shared/common";
import { isVariantUsedInSplits } from "@/wab/shared/core/splits";
import {
  getAllVariantsForTpl,
  getVariantLabel,
  isBaseVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isStandaloneVariant,
  isStyleOrCodeComponentVariant,
} from "@/wab/shared/Variants";
import { Dropdown } from "antd";
import { defer } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

type VariantsComboSelectProps = DefaultVariantsComboSelectProps;

const VariantsComboSelect = observer(function VariantsComboSelect(
  props: VariantsComboSelectProps
) {
  const studioCtx = useStudioCtx();
  const previewCtx = usePreviewCtx();

  const [showDropdown, setShowDropdown] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useLayoutEffect(() => {
    if (showDropdown) {
      defer(() => inputRef.current?.focus());
    }
  }, [showDropdown]);

  if (!previewCtx?.component) {
    return null;
  }

  const variants = getAllVariantsForTpl({
    component: previewCtx.component,
    tpl: null,
    site: studioCtx.site,
  }).filter(
    (v) =>
      !isStyleOrCodeComponentVariant(v) &&
      !isScreenVariant(v) &&
      !isPrivateStyleVariant(v) &&
      !isBaseVariant(v)
  );

  const [standaloneVariants, splitVariants, compVariants, globalVariants] =
    partitions(variants, [
      (v) => isStandaloneVariant(v),
      (v) => isVariantUsedInSplits(studioCtx.site, v),
      (v) => !isGlobalVariant(v),
    ]);

  const currentPreviewComponentData = {
    componentUuid: previewCtx.component.uuid,
    activeVariants: previewCtx.getVariants(),
    variantGroups: [
      ...standaloneVariants.map((v) => ({
        name: undefined,
        type: "standalone" as const,
        variants: [v],
      })),
      ...[
        ...xGroupBy(compVariants, (v) =>
          ensure(v.parent, `Variant ${v.name} (uuid ${v.uuid}) has no parent`)
        ).entries(),
      ].map(([vg, vs]) => ({
        type: vg.multi ? ("multi" as const) : ("single" as const),
        name: vg.param.variable.name,
        variants: vs,
      })),
      ...(splitVariants.length > 0
        ? [
            {
              type: "multi" as const,
              name: "Splits",
              variants: splitVariants,
            },
          ]
        : []),
      ...[
        ...xGroupBy(globalVariants, (v) =>
          ensure(v.parent, `Variant ${v.name} (uuid ${v.uuid}) has no parent`)
        ).entries(),
      ].map(([vg, vs]) => ({
        type: vg.multi ? ("multi" as const) : ("single" as const),
        name: vg.param.variable.name,
        variants: vs,
      })),
    ],
  };

  const activeVariants = currentPreviewComponentData.activeVariants;
  const activeVariantUuids = new Set(activeVariants.map((v) => v.uuid));
  const variantGroupsData = currentPreviewComponentData.variantGroups;

  return (
    <Dropdown
      transitionName=""
      trigger={["click"]}
      placement={"topLeft"}
      visible={showDropdown}
      onVisibleChange={(v) => {
        setIsOpen(v);
        setShowDropdown(v);
      }}
      overlay={() => (
        <VariantsMenu
          onDismiss={() => {
            setIsOpen(false);
            setShowDropdown(false);
          }}
          searchInputRef={inputRef}
          targetedVariants={activeVariantUuids}
          variantGroupsData={variantGroupsData}
          previewCtx={previewCtx}
          studioCtx={studioCtx}
        />
      )}
    >
      <PlasmicVariantsComboSelect isOpen={isOpen} {...props}>
        {activeVariants.length === 0
          ? "Base"
          : activeVariants
              .map((v) => getVariantLabel(studioCtx.site, v))
              .join(", ")}
      </PlasmicVariantsComboSelect>
    </Dropdown>
  );
});

export default VariantsComboSelect;
