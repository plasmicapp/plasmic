import { PlexusButton } from "@/wab/client/components/plexus/PlexusButton";
import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { ListBox, ListBoxItem } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import {
  arrayMoveIndex,
  arrayRemoveAt,
  arrayReplaceAt,
} from "@/wab/shared/collections";
import { ChoiceOptions, ChoiceValue } from "@plasmicapp/host";
import { observer } from "mobx-react";
import React from "react";

/**
 * Represent option while it is being edited.
 * For plain values, label is set to undefined, which is how the list keeps
 * its shape until someone actually provides label.
 */
interface ChoiceRow {
  value: ChoiceValue;
  label: string | undefined;
}

function toChoiceRows(options: ChoiceOptions): ChoiceRow[] {
  return options.map((option) => {
    if (typeof option !== "object") {
      return { value: option, label: undefined };
    }
    const label = String(option.label);
    return {
      value: option.value,
      label: label === String(option.value) ? undefined : label,
    };
  });
}

/**
 * Writes every option as labelled value for consistency.
 * An option left unnamed takes its own value as its label.
 */
function toChoiceOptions(rows: ChoiceRow[]): ChoiceOptions {
  return rows.map((row) => ({
    label: row.label || String(row.value),
    value: row.value,
  }));
}

function parseValue(inputVal: string, rows: ChoiceRow[]): ChoiceValue {
  const values = rows.map((row) => row.value).filter((value) => value !== "");
  if (values.length && values.every((value) => typeof value === "number")) {
    const parsed = Number(inputVal);
    return inputVal.trim() !== "" && !Number.isNaN(parsed) ? parsed : inputVal;
  }
  if (
    values.length &&
    values.every((value) => typeof value === "boolean") &&
    (inputVal === "true" || inputVal === "false")
  ) {
    return inputVal === "true";
  }
  return inputVal;
}

/** The value a new row starts with: the next number, or empty text. */
function nextValue(rows: ChoiceRow[]): ChoiceValue {
  const values = rows.map((row) => row.value);
  // Auto-increment if the current values are all numeric
  if (values.length && values.every((v) => !isNaN(parseFloat(String(v))))) {
    const last = values[values.length - 1];
    return typeof last === "number"
      ? Number(last) + 1
      : String(Number(last) + 1);
  }
  return "";
}

interface ArrayPrimitiveEditorProps {
  label?: string;
  options: ChoiceOptions;
  onChange: (options: ChoiceOptions) => void;
  "data-test-id": string;
}

export const ArrayPrimitiveEditor = observer(function ArrayPrimitiveEditor({
  label,
  options,
  onChange,
  "data-test-id": dataTestId,
}: ArrayPrimitiveEditorProps) {
  const rows = toChoiceRows(options ?? []);
  const change = (newRows: ChoiceRow[]) => onChange(toChoiceOptions(newRows));

  return (
    <LabeledItemRow
      layout={"vertical"}
      noContent={rows.length === 0}
      label={
        <div className={"flex-fill flex-row flex-vcenter gap-m"}>
          <div>{label ?? ""}</div>
          <span data-test-id={`${dataTestId}-add-btn`}>
            <PlexusButton
              onClick={() =>
                change([...rows, { value: nextValue(rows), label: undefined }])
              }
              start={<Icon icon={PlusIcon} />}
              iconStart={true}
              label={null}
              size={"extraSmall"}
              type={"clear"}
              color={"neutral"}
              ariaLabel={"Add"}
            />
          </span>
        </div>
      }
    >
      <ListBox
        appendPrepend={"append"}
        onReorder={(from, to) => change(arrayMoveIndex(rows, from, to))}
        data-test-id={dataTestId}
      >
        {rows.map((row, index) => {
          return (
            <ListBoxItem
              data-test-id={`${dataTestId}-${index}`}
              mainContent={
                <div className={"flex-fill flex-row gap-sm"}>
                  <PropValueEditor
                    label={"value"}
                    attr={"value"}
                    propType={"string"}
                    value={String(row.value)}
                    onChange={(val) =>
                      change(
                        arrayReplaceAt(rows, index, {
                          ...row,
                          value: parseValue(String(val ?? ""), rows),
                        })
                      )
                    }
                  />
                  <PropValueEditor
                    label={"label"}
                    attr={"label"}
                    propType={{
                      type: "string",
                      defaultValueHint: String(row.value),
                    }}
                    value={row.label ?? ""}
                    onChange={(val) =>
                      change(
                        arrayReplaceAt(rows, index, {
                          ...row,
                          label: String(val ?? ""),
                        })
                      )
                    }
                  />
                </div>
              }
              index={index}
              key={index}
              onRemove={() => change(arrayRemoveAt(rows, index))}
            />
          );
        })}
      </ListBox>
    </LabeledItemRow>
  );
});
