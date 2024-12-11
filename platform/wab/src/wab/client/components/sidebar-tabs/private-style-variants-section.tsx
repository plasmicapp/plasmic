import { StyleOrCodeComponentVariantLabel } from "@/wab/client/components/VariantControls";
import { getVariantIdentifier } from "@/wab/client/components/sidebar/RuleSetControls";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import VariantRow from "@/wab/client/components/variants/VariantRow";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { makeVariantMenu } from "@/wab/client/components/variants/variant-menu";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { ElementStatesTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { PRIVATE_STYLE_VARIANTS_CAP } from "@/wab/shared/Labels";
import { getPrivateStyleVariantsForTag } from "@/wab/shared/Variants";
import { spawn } from "@/wab/shared/common";
import { TplTag, Variant } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

export const PrivateStyleVariantsPanel = observer(
  function PrivateStyleVariantsPanel(props: {
    tpl: TplTag;
    viewCtx: ViewCtx;
    studioCtx: StudioCtx;
  }) {
    const { tpl, studioCtx, viewCtx } = props;

    const component = viewCtx.currentTplComponent().component;
    const [editingVariant, setEditingVariant] = React.useState<
      Variant | undefined
    >(undefined);

    if (!viewCtx.valState().maybeValSysRoot()) {
      return null;
    }

    const vcontroller = makeVariantsController(studioCtx);
    if (!vcontroller) {
      return null;
    }

    const addPrivateVariant = () =>
      studioCtx.changeUnsafe(() => {
        const variant = studioCtx
          .tplMgr()
          .createPrivateStyleVariant(component, tpl);
        setEditingVariant(variant);
        vcontroller.onAddedVariant(variant);
      });

    const privateStyleVariants = getPrivateStyleVariantsForTag(component, tpl);

    return (
      <SidebarSection
        key={String(privateStyleVariants.length > 0)}
        zeroBodyPadding
        title={
          <div data-test-id="private-style-variants-title">
            <LabelWithDetailedTooltip tooltip={<ElementStatesTooltip />}>
              {PRIVATE_STYLE_VARIANTS_CAP}
            </LabelWithDetailedTooltip>
          </div>
        }
        isHeaderActive={privateStyleVariants.length > 0}
        onHeaderClick={
          privateStyleVariants.length === 0 ? addPrivateVariant : undefined
        }
        controls={
          <IconLinkButton
            data-test-id="add-private-interaction-variant-button"
            onClick={addPrivateVariant}
          >
            <Icon icon={PlusIcon} />
          </IconLinkButton>
        }
      >
        {privateStyleVariants.length > 0 ? (
          <div
            className="pass-through"
            data-test-id="private-style-variants-section"
          >
            {privateStyleVariants.map((variant) => (
              <VariantRow
                key={variant.uuid}
                variant={variant}
                studioCtx={studioCtx}
                viewCtx={viewCtx}
                pinState={vcontroller.getPinState(variant)}
                onClick={() =>
                  studioCtx.changeUnsafe(() =>
                    vcontroller.onClickVariant(variant)
                  )
                }
                onToggle={() =>
                  studioCtx.changeUnsafe(() =>
                    vcontroller.onToggleVariant(variant)
                  )
                }
                onTarget={(target) =>
                  studioCtx.changeUnsafe(() =>
                    vcontroller.onTargetVariant(variant, target)
                  )
                }
                menu={makeVariantMenu({
                  variant,
                  component,
                  onRemove: () =>
                    spawn(
                      studioCtx.changeUnsafe(() =>
                        spawn(
                          studioCtx.siteOps().removeVariant(component, variant)
                        )
                      )
                    ),
                  onClone: () =>
                    spawn(
                      studioCtx.changeUnsafe(() =>
                        studioCtx.tplMgr().cloneVariant(component, variant)
                      )
                    ),
                  onCopyTo: (toVariant) =>
                    spawn(
                      studioCtx.changeUnsafe(() =>
                        studioCtx
                          .tplMgr()
                          .copyToVariant(component, variant, toVariant)
                      )
                    ),
                })}
                label={
                  <StyleOrCodeComponentVariantLabel
                    variant={variant}
                    forTag={tpl.tag}
                    forRoot={tpl === component.tplTree}
                    component={component}
                    onSelectorsChange={(sels) =>
                      viewCtx.change(() => {
                        variant.selectors = sels.map(getVariantIdentifier);
                        setEditingVariant(undefined);
                      })
                    }
                    onBlur={() =>
                      studioCtx.changeUnsafe(() => {
                        studioCtx
                          .siteOps()
                          .removeStyleOrCodeComponentVariantIfEmptyAndUnused(
                            component,
                            variant
                          );
                        setEditingVariant(undefined);
                      })
                    }
                    defaultEditing={variant === editingVariant}
                  />
                }
              />
            ))}
          </div>
        ) : null}
      </SidebarSection>
    );
  }
);
