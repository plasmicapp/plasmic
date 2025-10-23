import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  FullRow,
  LabeledItem,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { ExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import { DimTokenSpinner } from "@/wab/client/components/widgets/DimTokenSelector";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { ensure, spawn } from "@/wab/shared/common";
import { allAnimationSequences } from "@/wab/shared/core/sites";
import {
  AnimationDirectionKeyword,
  FillModeKeyword,
  animationDirectionKeywords,
  fillModeKeywords,
  timingFunctionKeywords,
} from "@/wab/shared/css/animations";
import { Animation } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

interface AnimationControlsProps {
  expsProvider: ExpsProvider;
  animation: Animation;
  vsh: VariantedStylesHelper;
}

export const AnimationControls = observer(function AnimationControls(
  props: AnimationControlsProps
) {
  const { animation, expsProvider } = props;
  const { studioCtx } = expsProvider;
  const allAnimSequences = allAnimationSequences(studioCtx.site, {
    includeDeps: "direct",
  });

  const handleChange = (f: () => void) => {
    spawn(
      studioCtx.change(({ success }) => {
        f();
        return success();
      })
    );
  };

  return (
    <>
      <SidebarSection title="Animation Sequence">
        <FullRow>
          <StyleSelect
            value={animation.sequence.uuid}
            onChange={(val) => {
              const sequence = allAnimSequences.find((seq) => seq.uuid === val);
              if (sequence) {
                handleChange(() => {
                  animation.sequence = sequence;
                });
              }
            }}
            valueSetState={animation.sequence ? "isSet" : "isUnset"}
          >
            {allAnimSequences.map((sequence) => (
              <StyleSelect.Option key={sequence.uuid} value={sequence.uuid}>
                {sequence.name}
              </StyleSelect.Option>
            ))}
          </StyleSelect>
        </FullRow>
      </SidebarSection>

      <SidebarSection title="Timing">
        <FullRow>
          <LabeledItem label="Duration">
            <DimTokenSpinner
              value={animation.duration}
              onChange={(val) =>
                handleChange(() => (animation.duration = val || "1s"))
              }
              noClear
              allowedUnits={["s", "ms"]}
              extraOptions={[]}
              studioCtx={studioCtx}
            />
          </LabeledItem>
        </FullRow>
        <FullRow>
          <LabeledItem label="Delay">
            <DimTokenSpinner
              value={animation.delay || "0s"}
              onChange={(val) =>
                handleChange(() => (animation.delay = val || "0s"))
              }
              allowedUnits={["s", "ms"]}
              extraOptions={[]}
              studioCtx={studioCtx}
            />
          </LabeledItem>
        </FullRow>
      </SidebarSection>

      <SidebarSection title="Easing & Repetition">
        <FullRow>
          <LabeledItem label="Easing">
            <StyleSelect
              value={animation.timingFunction || "ease"}
              onChange={(val) =>
                handleChange(() => (animation.timingFunction = val || "ease"))
              }
              valueSetState={animation.timingFunction ? "isSet" : "isUnset"}
            >
              {timingFunctionKeywords.map((timingFunction) => (
                <StyleSelect.Option value={timingFunction}>
                  {timingFunction}
                </StyleSelect.Option>
              ))}
            </StyleSelect>
          </LabeledItem>
        </FullRow>

        <FullRow>
          <LabeledItem label="Iteration Count">
            <DimTokenSpinner
              min={0}
              value={animation.iterationCount || "1"}
              onChange={(val) =>
                handleChange(() => (animation.iterationCount = val || "1"))
              }
              allowedUnits={[""]}
              extraOptions={["infinite"]}
              studioCtx={studioCtx}
            />
          </LabeledItem>
        </FullRow>

        <FullRow>
          <LabeledItem label="Direction">
            <StyleSelect
              value={animation.direction}
              onChange={(val) =>
                handleChange(
                  () =>
                    (animation.direction = ensure(
                      val as AnimationDirectionKeyword,
                      "Unexpected direction value"
                    ))
                )
              }
              valueSetState="isSet"
            >
              {animationDirectionKeywords.map((direction) => (
                <StyleSelect.Option value={direction}>
                  {direction}
                </StyleSelect.Option>
              ))}
            </StyleSelect>
          </LabeledItem>
        </FullRow>
      </SidebarSection>

      <SidebarSection title="Fill Mode">
        <FullRow>
          <StyleSelect
            value={animation.fillMode || "none"}
            onChange={(val) =>
              handleChange(
                () =>
                  (animation.fillMode = ensure(
                    val as FillModeKeyword,
                    "Unexpected fillMode value"
                  ))
              )
            }
            valueSetState={animation.fillMode ? "isSet" : "isUnset"}
          >
            {fillModeKeywords.map((fillMode) => (
              <StyleSelect.Option value={fillMode}>
                {fillMode}
              </StyleSelect.Option>
            ))}
          </StyleSelect>
        </FullRow>
      </SidebarSection>
    </>
  );
});
