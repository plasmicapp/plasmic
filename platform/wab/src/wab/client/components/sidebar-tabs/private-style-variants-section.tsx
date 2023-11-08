import { observer } from "mobx-react-lite";
import React from "react";
import { TplTag, Variant } from "../../../classes";
import { spawn } from "../../../common";
import { PRIVATE_STYLE_VARIANTS_CAP } from "../../../shared/Labels";
import { getPrivateStyleVariantsForTag } from "../../../shared/Variants";
import PlusIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { SidebarSection } from "../sidebar/SidebarSection";
import { StyleVariantLabel } from "../VariantControls";
import { makeVariantMenu } from "../variants/variant-menu";
import VariantRow from "../variants/VariantRow";
import { makeVariantsController } from "../variants/VariantsController";
import { IconLinkButton } from "../widgets";
import { ElementStatesTooltip } from "../widgets/DetailedTooltips";
import { Icon } from "../widgets/Icon";
import { LabelWithDetailedTooltip } from "../widgets/LabelWithDetailedTooltip";

export const PrivateStyleVariantsPanel = observer(
  function PrivateStyleVariantsPanel(props: {
    tpl: TplTag;
    viewCtx: ViewCtx;
    studioCtx: StudioCtx;
  }) {
    const { tpl, studioCtx, viewCtx } = props;

    const component = viewCtx.currentTplComponent().component;
    const [editingVariant, setEditingVariant] =
      React.useState<Variant | undefined>(undefined);

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
                  <StyleVariantLabel
                    variant={variant}
                    forTag={tpl.tag}
                    forRoot={tpl === component.tplTree}
                    onSelectorsChange={(sels) =>
                      viewCtx.change(() => {
                        variant.selectors = sels;
                        setEditingVariant(undefined);
                      })
                    }
                    onBlur={() =>
                      studioCtx.changeUnsafe(() => {
                        studioCtx
                          .siteOps()
                          .removeStyleVariantIfEmptyAndUnused(
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
