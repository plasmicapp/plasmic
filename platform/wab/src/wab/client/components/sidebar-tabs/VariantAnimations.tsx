import { useNewAnimationContext } from "@/wab/client/components/sidebar-tabs/style-tab";
import { useAnimations } from "@/wab/client/components/sidebar-tabs/useAnimations";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { AnimationControls } from "@/wab/client/components/style-controls/AnimationControls";
import { StyleWrapper } from "@/wab/client/components/style-controls/StyleWrapper";
import { ListBox, ListBoxItem } from "@/wab/client/components/widgets";
import KeyframesIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Keyframes";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { VariantCombo, tryGetPrivateStyleVariant } from "@/wab/shared/Variants";
import { arrayEqIgnoreOrder } from "@/wab/shared/common";
import { Animation, TplTag } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

interface VariantAnimationsRenderProps {
  addAnimationLayer: () => void;
  animationsList: React.ReactNode | null;
}

interface VariantAnimationsProps {
  variants: VariantCombo;
  tpl: TplTag;
  viewCtx: ViewCtx;
  children: (props: VariantAnimationsRenderProps) => React.ReactNode;
}

export const VariantAnimations = observer(function VariantAnimations(
  props: VariantAnimationsProps
) {
  const { variants, tpl, viewCtx, children } = props;
  const { newAnimation, onAnimationAdded } = useNewAnimationContext();
  const privateStyleVariant = tryGetPrivateStyleVariant(variants);

  const {
    addAnimationLayer,
    animations,
    inspectedAnimation,
    vsh,
    closeInspectedAnimation,
    removeAnimation,
    reorderAnimations,
    openAnimationForEditing,
    onInspectedAnimationChange,
  } = useAnimations({ tpl, variants, viewCtx });

  // Determine if we should auto-add an animation based on context
  // - For "base" type: auto-add if there's no private style variant in the combo
  // - For "selector" type: auto-add if the private style variant has the matching selector
  const shouldAutoAdd =
    (newAnimation?.type === "base" && !privateStyleVariant) ||
    (newAnimation?.type === "selector" &&
      arrayEqIgnoreOrder(privateStyleVariant?.selectors || [], [
        newAnimation.cssSelector,
      ]));

  // Auto-add animation when requested from the Animations submenu
  React.useEffect(() => {
    if (shouldAutoAdd) {
      addAnimationLayer();
      onAnimationAdded();
    }
  }, [shouldAutoAdd]);

  const animationsList =
    animations.length > 0 ? (
      <StyleWrapper styleName={["animation"]} className="flex-fill">
        <ListBox appendPrepend={"append"} onReorder={reorderAnimations}>
          {animations.map((animation: Animation, i: number) => {
            return (
              <ListBoxItem
                key={animation.uid}
                index={i}
                onRemove={() => removeAnimation(animation)}
                onClick={() => openAnimationForEditing(i)}
                mainContent={
                  <div className={"flex flex-vcenter gap-sm"}>
                    <KeyframesIcon className={"dimfg text-xlg"} />
                    <code className="text-ellipsis">
                      {animation.sequence.name} ({animation.duration})
                    </code>
                  </div>
                }
                gridThumbnail
              />
            );
          })}
        </ListBox>
      </StyleWrapper>
    ) : null;

  return (
    <>
      {children({
        addAnimationLayer,
        animationsList,
      })}

      <SidebarModal
        show={!!inspectedAnimation}
        onClose={closeInspectedAnimation}
        title="Apply Animation"
      >
        {inspectedAnimation && (
          <div className="panel-content">
            <AnimationControls
              studioCtx={viewCtx.studioCtx}
              animation={inspectedAnimation}
              vsh={vsh}
              onUpdated={onInspectedAnimationChange}
            />
          </div>
        )}
      </SidebarModal>
    </>
  );
});
