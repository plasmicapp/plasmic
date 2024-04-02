import { Transition } from "@/wab/client/components/sidebar-tabs/TransitionsSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { Textbox } from "@/wab/client/components/widgets/Textbox";
import { asValidCssTime } from "@/wab/css";
import { observer } from "mobx-react";
import React, { useState } from "react";
import StyleSelect from "./StyleSelect";

interface TransitionPanelProps {
  transition: Transition;
  onChange: (newValue: Transition) => void;
}

export const TransitionPanel = observer(function TransitionPanel(
  props: TransitionPanelProps
) {
  const handleChange = (f: () => Transition) => {
    props.onChange(f());
  };

  const { transition } = props;

  const supportedProps = [
    "all",
    "color",
    "background",
    "opacity",
    "border",
    "border-color",
    "border-radius",
    "box-shadow",
    "transform",
    "filter",
  ].sort();

  const timingFunctions = [
    "linear",
    "ease",
    "ease-in",
    "ease-in-out",
    "ease-out",
  ];

  const timingFunctionsLabels = [
    "Linear",
    "Ease",
    "Ease In",
    "Ease In & Out",
    "Ease Out",
  ];

  const [styleDuration, setStyleDuration] = useState(
    transition.transitionDuration
  );
  const [styleDelay, setStyleDelay] = useState(transition.transitionDelay);

  const removeLeadingZeros = (s: string): string => {
    let idx = 0;
    while (
      idx + 1 < s.length &&
      s[idx] === "0" &&
      s[idx + 1] >= "0" &&
      s[idx + 1] <= "9"
    )
      idx++;
    return s.substr(idx);
  };

  return (
    <>
      <LabeledItemRow label="What to animate" labelSize="small">
        <StyleSelect
          value={transition.transitionProperty}
          onChange={(value) => {
            if (value) {
              handleChange(() => {
                return {
                  ...transition,
                  transitionProperty: value as string,
                };
              });
            }
          }}
          valueSetState={"isSet"}
          aria-label="What to animate"
        >
          {supportedProps.map((value) => (
            <StyleSelect.Option value={value} key={value}>
              {value}
            </StyleSelect.Option>
          ))}
        </StyleSelect>
      </LabeledItemRow>
      <LabeledItemRow label="Duration" labelSize="small">
        <Textbox
          styleType={["mono", "gray"]}
          value={styleDuration}
          onChange={(e) => setStyleDuration(e.target.value)}
          onEdit={(value) => {
            value = removeLeadingZeros(value.trim());
            const timeValue = asValidCssTime(value);
            if (timeValue) {
              handleChange(() => ({
                ...transition,
                transitionDuration: timeValue,
              }));
              setStyleDuration(timeValue);
            } else {
              setStyleDuration(transition.transitionDuration);
            }
          }}
          selectAllOnFocus
          onEscape={() => {
            setStyleDuration(transition.transitionDuration);
          }}
          aria-label={"Duration"}
        />
      </LabeledItemRow>
      <LabeledItemRow label="Delay" labelSize="small">
        <Textbox
          styleType={["mono", "gray"]}
          value={styleDelay}
          onChange={(e) => setStyleDelay(e.target.value)}
          onEdit={(value) => {
            value = removeLeadingZeros(value.trim());
            const timeValue = asValidCssTime(value);
            if (timeValue) {
              handleChange(() => ({
                ...transition,
                transitionDelay: timeValue,
              }));
              setStyleDelay(timeValue);
            } else {
              setStyleDelay(transition.transitionDelay);
            }
          }}
          selectAllOnFocus
          onEscape={() => {
            setStyleDelay(transition.transitionDelay);
          }}
          aria-label="Delay"
        />
      </LabeledItemRow>
      <LabeledItemRow label="Curve" labelSize="small">
        <StyleSelect
          value={transition.transitionTimingFunction}
          onChange={(value) => {
            if (value) {
              handleChange(() => {
                return {
                  ...transition,
                  transitionTimingFunction: value as string,
                };
              });
            }
          }}
          valueSetState={"isSet"}
          aria-label="Timing curve"
        >
          {timingFunctions.map((value, i) => (
            <StyleSelect.Option
              key={value}
              value={value}
              textValue={timingFunctionsLabels[i]}
            >
              {timingFunctionsLabels[i]}
            </StyleSelect.Option>
          ))}
        </StyleSelect>
      </LabeledItemRow>
    </>
  );
});
