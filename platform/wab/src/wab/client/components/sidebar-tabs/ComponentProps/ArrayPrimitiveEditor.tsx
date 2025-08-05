import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import LabeledItem from "@/wab/client/components/sidebar-tabs/StateManagement/LabeledItem";
import {
  ListBox,
  ListBoxItem,
  PlainLinkButton,
} from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import {
  arrayMoveIndex,
  arrayRemoveAt,
  arrayReplaceAt,
} from "@/wab/shared/collections";
import { ChoiceValue } from "@plasmicapp/host";
import { observer } from "mobx-react";
import React from "react";

interface ArrayPrimitiveEditorProps {
  label?: string;
  values: ChoiceValue[];
  onChange: (val: ChoiceValue[]) => void;
  "data-test-id": string;
}

export const ArrayPrimitiveEditor = observer(function ArrayPrimitiveEditor({
  label,
  values,
  onChange,
  "data-test-id": dataTestId,
}: ArrayPrimitiveEditorProps) {
  const addNewElement = () => {
    let newVal: ChoiceValue = "";
    // Add a number if current values are numbers
    if (
      values.length &&
      values.every((v) => !isNaN(parseFloat(v.toString())))
    ) {
      newVal = Number(values[values.length - 1]) + 1;
    }
    onChange([...(values ?? []), newVal]);
  };
  const handleReorder = (from: number, to: number) => {
    onChange(arrayMoveIndex(values, from, to));
  };
  const handleValueChange = (index: number, newVal: string) => {
    onChange(arrayReplaceAt(values, index, newVal));
  };

  return (
    <LabeledItem
      aria-label={label ?? ""}
      label={
        <div className={"flex-fill flex-row justify-between"}>
          <div>{label ?? ""}</div>
          <PlainLinkButton
            onClick={addNewElement}
            type="button"
            data-test-id={`${dataTestId}-add-btn`}
          >
            <Icon icon={PlusIcon} /> {"Add"}
          </PlainLinkButton>
        </div>
      }
      layout={"vertical"}
      value={
        <ListBox
          appendPrepend={"append"}
          onReorder={(from, to) => {
            handleReorder(from, to);
          }}
          data-test-id={dataTestId}
        >
          {values.map((value, index) => {
            return (
              <ListBoxItem
                data-test-id={`${dataTestId}-${index}`}
                mainContent={
                  <PropValueEditor
                    label={"item"}
                    attr={"item"}
                    propType={"string"}
                    value={value}
                    onChange={(val) => handleValueChange(index, val as string)}
                  />
                }
                index={index}
                key={index}
                onRemove={() => {
                  onChange(arrayRemoveAt(values, index));
                }}
              />
            );
          })}
        </ListBox>
      }
    />
  );
});
