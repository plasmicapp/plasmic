import { StyleOrCodeComponentVariantLabel } from "@/wab/client/components/VariantControls";
import { BaseVariantRow } from "@/wab/client/components/sidebar-tabs/BaseVariantRow";
import { VariantAnimations } from "@/wab/client/components/sidebar-tabs/VariantAnimations";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { makeClientPinManager } from "@/wab/client/components/variants/ClientPinManager";
import VariantRow from "@/wab/client/components/variants/VariantRow";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { makeVariantMenu } from "@/wab/client/components/variants/variant-menu";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { ElementVariantsTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { PRIVATE_STYLE_VARIANTS_CAP } from "@/wab/shared/Labels";
import {
  ensureVariantSetting,
  getPrivateStyleVariantsForTag,
} from "@/wab/shared/Variants";
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

    const vcontroller = makeVariantsController(studioCtx, viewCtx);
    if (!vcontroller) {
      return null;
    }

    const pinManager = makeClientPinManager(viewCtx);
    const vtm = viewCtx.variantTplMgr();

    const addPrivateVariant = () =>
      studioCtx.changeUnsafe(() => {
        const variant = studioCtx
          .tplMgr()
          .createPrivateStyleVariant(component, tpl);

        ensureVariantSetting(tpl, [variant]);
        setEditingVariant(variant);
        vcontroller.onAddedVariant(variant);
      });

    const privateStyleVariants = getPrivateStyleVariantsForTag(component, tpl);

    // Get the current component variant combo (excluding private style variants and base variant)
    // This is needed to properly scope animations for VariantCombo [ComponentVariant, PrivateStyleVariant]
    const sharedVariantCombo = vtm.getCurrentSharedVariantComboForNode(tpl, {
      excludeBase: true,
    });

    // Check if any private style variant for this tpl is currently targeted
    const targetedVariants = vcontroller.getTargetedVariants();
    const hasTargetedPrivateVariant = privateStyleVariants.some((v) =>
      targetedVariants.includes(v)
    );

    return (
      <SidebarSection
        key={String(privateStyleVariants.length > 0)}
        zeroBodyPadding
        title={
          <div data-test-id="private-style-variants-title">
            <LabelWithDetailedTooltip tooltip={<ElementVariantsTooltip />}>
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
        <div
          className="pass-through"
          data-test-id="private-style-variants-section"
        >
          {/* Base row - represents the default state (no element state variant selected) */}
          <BaseVariantRow
            tpl={tpl}
            studioCtx={studioCtx}
            viewCtx={viewCtx}
            pinState={
              !hasTargetedPrivateVariant ? "selected-pinned" : undefined
            }
            onClick={() =>
              studioCtx.changeUnsafe(() =>
                pinManager.removeSelectedVariants(privateStyleVariants)
              )
            }
          />

          {privateStyleVariants.map((variant) => (
            <VariantAnimations
              key={variant.uuid}
              variants={[...sharedVariantCombo, variant]}
              tpl={tpl}
              viewCtx={viewCtx}
            >
              {({
                addAnimationLayer,
                animationsList,
                animations,
                isAnimationPlaying,
                playAnimations,
                stopAnimations,
                previewAnimationButton,
              }) => (
                <VariantRow
                  variant={variant}
                  studioCtx={studioCtx}
                  viewCtx={viewCtx}
                  pinState={vcontroller.getPinState(variant)}
                  onClick={() =>
                    studioCtx.changeUnsafe(() => {
                      // Toggle behavior: if already selected, turn off; otherwise turn on
                      if (vcontroller.isTargeted(variant)) {
                        vcontroller.onToggleVariant(variant);
                      } else {
                        vcontroller.onClickVariant(variant);
                      }
                    })
                  }
                  menu={makeVariantMenu({
                    variant,
                    component,
                    onRemove: () =>
                      spawn(
                        studioCtx.changeUnsafe(() =>
                          spawn(
                            studioCtx
                              .siteOps()
                              .removeVariant(component, variant)
                          )
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
                    previewAnimation:
                      animations.length > 0
                        ? isAnimationPlaying
                          ? {
                              type: "stop",
                              onClick: () => stopAnimations(),
                            }
                          : {
                              type: "play",
                              onClick: () => playAnimations(animations),
                            }
                        : undefined,
                  })}
                  addAnimationLayer={addAnimationLayer}
                  previewAnimationContainer={{
                    children: previewAnimationButton,
                  }}
                  additional={animationsList}
                  label={
                    <StyleOrCodeComponentVariantLabel
                      variant={variant}
                      forTag={tpl.tag}
                      forRoot={tpl === component.tplTree}
                      component={component}
                      onBlur={() => {
                        setEditingVariant(undefined);
                      }}
                      defaultEditing={variant === editingVariant}
                    />
                  }
                  hideIcon={true}
                />
              )}
            </VariantAnimations>
          ))}
        </div>
      </SidebarSection>
    );
  }
);
