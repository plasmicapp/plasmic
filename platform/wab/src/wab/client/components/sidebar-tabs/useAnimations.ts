import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { useForceUpdate } from "@/wab/client/useForceUpdate";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import { useSignalListener } from "@/wab/commons/components/use-signal-listener";
import { ANIMATIONS_LOWER } from "@/wab/shared/Labels";
import { VariantCombo, tryGetVariantSetting } from "@/wab/shared/Variants";
import { spawn } from "@/wab/shared/common";
import { allAnimationSequences } from "@/wab/shared/core/sites";
import { Animation, TplTag } from "@/wab/shared/model/classes";
import { notification } from "antd";
import { useState } from "react";

interface UseAnimationsOptions {
  tpl: TplTag;
  variants: VariantCombo;
  viewCtx: ViewCtx;
  isDisabled?: boolean;
}

export function useAnimations(options: UseAnimationsOptions) {
  const { tpl, variants, viewCtx, isDisabled } = options;
  const studioCtx = useStudioCtx();
  const vtm = viewCtx.variantTplMgr();

  // Get animations using VariantTplMgr (handles private vs component variant logic)
  const { animations, definedIndicator } = vtm.getAnimationInfoForVariantCombo(
    tpl,
    variants
  );

  const vs = tryGetVariantSetting(tpl, variants);
  const targetRs = vs?.rs;

  const allAnimSequences = allAnimationSequences(studioCtx.site, {
    includeDeps: "direct",
  });

  const [inspectedIndex, setInspectedIndex] = useState<number | undefined>();
  const inspectedAnimation =
    inspectedIndex !== undefined ? animations?.[inspectedIndex] : undefined;

  const vsh = makeVariantedStylesHelperFromCurrentCtx(studioCtx);

  const focusedTpl = studioCtx.focusedViewCtx()?.focusedTpl();
  const forceUpdate = useForceUpdate();
  useSignalListener(studioCtx.animationChanged, forceUpdate, [studioCtx]);

  const isAnimationPlaying =
    focusedTpl &&
    targetRs &&
    studioCtx.styleMgrBcast.hasActiveAnimationPreview(focusedTpl, targetRs);

  const playAnimations = (previewAnimations: Animation[]) => {
    if (
      previewAnimations.length === 0 ||
      isDisabled ||
      !focusedTpl ||
      !targetRs
    ) {
      return;
    }
    spawn(
      studioCtx.styleMgrBcast.playAnimationPreview(
        focusedTpl,
        targetRs,
        previewAnimations
      )
    );
  };

  const stopAnimations = () => {
    if (isAnimationPlaying && focusedTpl && targetRs) {
      studioCtx.styleMgrBcast.stopAnimationPreview(focusedTpl, targetRs);
    }
  };

  const triggerAnimationPreviewOnUpdate = (previewAnimations: Animation[]) => {
    stopAnimations();
    playAnimations(previewAnimations);
  };

  const closeInspectedAnimation = () => {
    setInspectedIndex(undefined);
    stopAnimations();
  };

  const onInspectedAnimationChange = () => {
    triggerAnimationPreviewOnUpdate(animations);
  };

  const addAnimationLayer = () => {
    if (allAnimSequences.length === 0) {
      studioCtx.switchLeftTab("animationSequences", { highlight: true });
      notification.warn({
        message: `Please add ${ANIMATIONS_LOWER} in your project.`,
      });
      return;
    }

    spawn(
      studioCtx.change(({ success }) => {
        const defaultSequence = allAnimSequences[0];
        const newAnimation = studioCtx.tplMgr().addAnimation(defaultSequence);
        const newAnimations = vtm.addAnimation(tpl, newAnimation, variants);

        setInspectedIndex(newAnimations.length - 1);
        triggerAnimationPreviewOnUpdate(newAnimations);

        return success();
      })
    );
  };

  const removeAnimation = (animation: Animation) => {
    if (isDisabled) {
      return;
    }

    spawn(
      studioCtx.change(({ success }) => {
        vtm.removeAnimation(tpl, animation, variants);
        return success();
      })
    );
  };

  const reorderAnimations = (from: number, to: number) => {
    if (isDisabled) {
      return;
    }

    spawn(
      studioCtx.change(({ success }) => {
        const newAnimations = vtm.reorderAnimations(tpl, from, to, variants);
        triggerAnimationPreviewOnUpdate(newAnimations);
        return success();
      })
    );
  };

  const openAnimationForEditing = (index: number) => {
    if (isDisabled) {
      return;
    }

    spawn(
      studioCtx.change(({ success }) => {
        vtm.ensureAnimationsForEditing(tpl, variants);
        setInspectedIndex(index);
        return success();
      })
    );
  };

  return {
    inspectedAnimation,
    animations,
    vsh,
    isAnimationPlaying,
    addAnimationLayer,
    removeAnimation,
    reorderAnimations,
    openAnimationForEditing,
    closeInspectedAnimation,
    playAnimations,
    stopAnimations,
    onInspectedAnimationChange,
    definedIndicator,
  };
}
