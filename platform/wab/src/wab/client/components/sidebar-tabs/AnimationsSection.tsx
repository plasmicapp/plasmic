import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { shouldBeDisabled } from "@/wab/client/components/sidebar/sidebar-helpers";
import { AnimationControls } from "@/wab/client/components/style-controls/AnimationControls";
import {
  ExpsProvider,
  StylePanelSection,
  TplExpsProvider,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { StyleWrapper } from "@/wab/client/components/style-controls/StyleWrapper";
import {
  IconLinkButton,
  ListBox,
  ListBoxItem,
} from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { ANIMATION_SEQUENCES_CAP } from "@/wab/shared/Labels";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { arrayMoveIndex, arrayRemove } from "@/wab/shared/collections";
import { spawn } from "@/wab/shared/common";
import { allAnimationSequences } from "@/wab/shared/core/sites";
import { cloneAnimation } from "@/wab/shared/core/styles";
import { Animation } from "@/wab/shared/model/classes";
import { Tooltip, notification } from "antd";
import { observer } from "mobx-react";
import React from "react";

interface AnimationsSectionProps {
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
}

export const AnimationsSection = observer(function AnimationsSection(
  props: AnimationsSectionProps
) {
  const { expsProvider } = props;
  const { studioCtx } = expsProvider;

  // Determine which animations to show:
  // - If target variant has animations, show only target animations (override exists)
  // - Otherwise, show merged animations (including inherited from base)
  const targetAnimations = expsProvider.targetRs().animations;
  const hasTargetAnimations = targetAnimations.length > 0;
  const inheritedAnimations =
    expsProvider instanceof TplExpsProvider
      ? expsProvider.effectiveVs().rs.animations
      : [];

  const animations = hasTargetAnimations
    ? targetAnimations
    : inheritedAnimations;

  const allAnimSequences = allAnimationSequences(studioCtx.site, {
    includeDeps: "direct",
  });

  const [inspectedAnimation, setInspectedAnimation] = React.useState<
    Animation | undefined
  >();
  const [index, setIndex] = React.useState<number | undefined>();
  const sc = useStyleComponent();

  const vsh = props.vsh ?? makeVariantedStylesHelperFromCurrentCtx(studioCtx);

  const updateAnimations = (newAnimations: Animation[]) => {
    spawn(
      studioCtx.change(({ success }) => {
        const targetRs = expsProvider.targetRs();
        if (newAnimations.length > 0) {
          targetRs.animations = [...newAnimations];
        } else {
          targetRs.animations = [];
        }

        return success();
      })
    );
  };

  const maybeCloneInheritedAnimations = () => {
    if (!hasTargetAnimations) {
      // At this point, the target variant has no overrides for Animations section, so we are displaying animations
      // inherited from base variant. When user inspects it to override the animation value in a target variant, we will clone
      // the inherited animations for overrides.
      const targetRs = expsProvider.targetRs();
      targetRs.animations = inheritedAnimations.map((anim) =>
        cloneAnimation(anim)
      );
    }
  };

  const inspectAnimation = (animationIndex: number) => {
    const animation = expsProvider.targetRs().animations[animationIndex];
    setInspectedAnimation(animation);
    setIndex(animationIndex);
  };

  const addAnimationLayer = () => {
    // Get available animation sequences
    if (allAnimSequences.length === 0) {
      studioCtx.switchLeftTab("animationSequences", { highlight: true });
      notification.warn({
        message: `Please add ${ANIMATION_SEQUENCES_CAP} in your project.`,
      });
      return;
    }

    spawn(
      studioCtx.change(({ success }) => {
        // Use the first available sequence as default
        const defaultSequence = allAnimSequences[0];
        const newAnimation = studioCtx.tplMgr().addAnimation(defaultSequence);

        maybeCloneInheritedAnimations();
        const targetRs = expsProvider.targetRs();
        targetRs.animations = [...targetRs.animations, newAnimation];

        const newAnimations = targetRs.animations;
        inspectAnimation(newAnimations.length - 1);

        return success();
      })
    );
  };

  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props: {},
    label: "Animations",
    indicators: sc.definedIndicators("animation"),
  });

  return (
    <StylePanelSection
      key={String(animations.length > 0)}
      expsProvider={expsProvider}
      title={"Animations"}
      styleProps={["animation"]}
      onExtraContentExpanded={() => {
        if (animations.length === 0) {
          addAnimationLayer();
        }
      }}
      onHeaderClick={animations.length === 0 ? addAnimationLayer : undefined}
      controls={
        <MaybeWrap
          cond={!!disabledTooltip && !!isDisabled}
          wrapper={(e) => <Tooltip title={disabledTooltip}>{e}</Tooltip>}
        >
          <IconLinkButton onClick={addAnimationLayer} disabled={isDisabled}>
            <Icon icon={PlusIcon} />
          </IconLinkButton>
        </MaybeWrap>
      }
      defaultHeaderAction={() => !isDisabled && addAnimationLayer()}
    >
      {animations.length > 0 && (
        <>
          <SidebarModal
            show={!!inspectedAnimation && !isDisabled}
            onClose={() => {
              setInspectedAnimation(undefined);
              setIndex(undefined);
            }}
            title="Animation"
          >
            {inspectedAnimation && index !== undefined && (
              <div className="panel-content">
                <AnimationControls
                  expsProvider={expsProvider}
                  animation={inspectedAnimation}
                  vsh={vsh}
                />
              </div>
            )}
          </SidebarModal>
          <StyleWrapper
            styleName={["animation"]}
            className="flex-fill"
            showDefinedIndicator={true}
          >
            <ListBox
              appendPrepend={"append"}
              {...(isDisabled
                ? {}
                : {
                    onReorder: (from, to) => {
                      const newAnimations = arrayMoveIndex(
                        animations,
                        from,
                        to
                      );
                      updateAnimations(newAnimations);
                    },
                  })}
            >
              {animations.map((animation: Animation, i: number) => {
                const sequenceName = animation.sequence.name;
                const duration = animation.duration;

                return (
                  <ListBoxItem
                    key={i}
                    index={i}
                    onRemove={() => {
                      if (!isDisabled) {
                        const newAnimations = [...animations];
                        arrayRemove(newAnimations, animation);
                        updateAnimations(newAnimations);
                      }
                    }}
                    onClick={() => {
                      if (!isDisabled) {
                        spawn(
                          studioCtx.change(({ success }) => {
                            maybeCloneInheritedAnimations();
                            inspectAnimation(i);

                            return success();
                          })
                        );
                      }
                    }}
                    mainContent={
                      <>
                        <code className="text-ellipsis">
                          {sequenceName} ({duration})
                        </code>
                      </>
                    }
                    gridThumbnail
                  />
                );
              })}
            </ListBox>
          </StyleWrapper>
        </>
      )}
    </StylePanelSection>
  );
});
