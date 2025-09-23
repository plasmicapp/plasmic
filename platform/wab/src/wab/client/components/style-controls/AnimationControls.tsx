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
          <LabeledItem label="Duration" labelSize="small">
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
          <LabeledItem label="Delay" labelSize="small">
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
          <LabeledItem label="Easing" labelSize="small">
            <StyleSelect
              value={animation.timingFunction || "ease"}
              onChange={(val) =>
                handleChange(() => (animation.timingFunction = val || "ease"))
              }
              valueSetState={animation.timingFunction ? "isSet" : "isUnset"}
            >
              <StyleSelect.Option value="ease">Ease</StyleSelect.Option>
              <StyleSelect.Option value="ease-in">Ease In</StyleSelect.Option>
              <StyleSelect.Option value="ease-out">Ease Out</StyleSelect.Option>
              <StyleSelect.Option value="ease-in-out">
                Ease In Out
              </StyleSelect.Option>
              <StyleSelect.Option value="linear">Linear</StyleSelect.Option>
              <StyleSelect.Option value="cubic-bezier(0.68, -0.55, 0.265, 1.55)">
                Back
              </StyleSelect.Option>
            </StyleSelect>
          </LabeledItem>
        </FullRow>

        <FullRow>
          <LabeledItem label="Iteration Count" labelSize="small">
            <StyleSelect
              value={animation.iterationCount || "1"}
              onChange={(val) =>
                handleChange(() => (animation.iterationCount = val || "1"))
              }
              valueSetState={animation.iterationCount ? "isSet" : "isUnset"}
            >
              <StyleSelect.Option value="1">1</StyleSelect.Option>
              <StyleSelect.Option value="2">2</StyleSelect.Option>
              <StyleSelect.Option value="3">3</StyleSelect.Option>
              <StyleSelect.Option value="5">5</StyleSelect.Option>
              <StyleSelect.Option value="infinite">Infinite</StyleSelect.Option>
            </StyleSelect>
          </LabeledItem>
        </FullRow>

        <FullRow>
          <LabeledItem label="Direction" labelSize="small">
            <StyleSelect
              value={animation.direction}
              onChange={(val) =>
                handleChange(
                  () =>
                    (animation.direction = ensure(
                      val as
                        | "normal"
                        | "reverse"
                        | "alternate"
                        | "alternate-reverse",
                      "Unexpected direction value"
                    ))
                )
              }
              valueSetState="isSet"
            >
              <StyleSelect.Option value="normal">Normal</StyleSelect.Option>
              <StyleSelect.Option value="reverse">Reverse</StyleSelect.Option>
              <StyleSelect.Option value="alternate">
                Alternate
              </StyleSelect.Option>
              <StyleSelect.Option value="alternate-reverse">
                Alternate Reverse
              </StyleSelect.Option>
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
                    val as "none" | "forwards" | "backwards" | "both",
                    "Unexpected fillMode value"
                  ))
              )
            }
            valueSetState={animation.fillMode ? "isSet" : "isUnset"}
          >
            <StyleSelect.Option value="none">None</StyleSelect.Option>
            <StyleSelect.Option value="forwards">Forwards</StyleSelect.Option>
            <StyleSelect.Option value="backwards">Backwards</StyleSelect.Option>
            <StyleSelect.Option value="both">Both</StyleSelect.Option>
          </StyleSelect>
        </FullRow>
      </SidebarSection>
    </>
  );
});
