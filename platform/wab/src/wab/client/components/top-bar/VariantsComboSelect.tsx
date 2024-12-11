import { usePreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import VariantsMenu from "@/wab/client/components/top-bar/VariantsMenu";
import {
  DefaultVariantsComboSelectProps,
  PlasmicVariantsComboSelect,
} from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicVariantsComboSelect";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, xGroupBy } from "@/wab/shared/common";
import {
  getAllVariantsForTpl,
  isBaseVariant,
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

  const currentPreviewComponentData = {
    componentUuid: previewCtx.component.uuid,
    activeVariants: previewCtx
      .getVariants()
      .map((v) => ({ name: v.name, uuid: v.uuid })),
    variantGroups: [
      ...variants
        .filter((v) => isStandaloneVariant(v))
        .map((v) => ({
          type: "standalone" as const,
          name: ensure(
            v.parent,
            `Variant ${v.name} (uuid ${v.uuid}) has no parent`
          ).param.variable.name,
          variants: [
            {
              name: v.name,
              uuid: v.uuid,
            },
          ],
        })),
      ...[
        ...xGroupBy(
          variants.filter((v) => !isStandaloneVariant(v)),
          (v) =>
            ensure(v.parent, `Variant ${v.name} (uuid ${v.uuid}) has no parent`)
        ).entries(),
      ].map(([vg, vs]) => ({
        type: vg.multi ? ("multi" as const) : ("single" as const),
        name: vg.param.variable.name,
        variants: vs.map((v) => ({
          uuid: v.uuid,
          name: v.name,
        })),
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
          : activeVariants.map((v) => v.name).join(", ")}
      </PlasmicVariantsComboSelect>
    </Dropdown>
  );
});

export default VariantsComboSelect;
