import { CodeEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/CodeEditor";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { Icon } from "@/wab/client/components/widgets/Icon";
import Select from "@/wab/client/components/widgets/Select";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import Textbox from "@/wab/client/components/widgets/Textbox";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  DataTokenType,
  dataTypes,
  getDataTokenType,
} from "@/wab/commons/DataToken";
import { DataToken } from "@/wab/shared/model/classes";
import { isNil } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

export const DataTokenEditModal = observer(function DataTokenEditModal(props: {
  token: DataToken;
  studioCtx: StudioCtx;
  defaultEditingName?: boolean;
  onClose: () => void;
}) {
  const { token, studioCtx, defaultEditingName, onClose } = props;

  const [selectedTokenType, setSelectedTokenType] =
    React.useState<DataTokenType>(getDataTokenType(token.value));

  const [value, setValue] = React.useState(
    getDisplayValue(token.value, selectedTokenType)
  );

  const storeValue = React.useCallback(
    (val: string, tokenType: DataTokenType) => {
      return studioCtx.changeUnsafe(() => {
        token.value = getStoredValue(val, tokenType);
      });
    },
    [studioCtx, token]
  );

  const onChange = React.useCallback(
    (val: string, commitChange: boolean) => {
      // Only update if the value is valid for this token type
      if (!isValidValue(val, selectedTokenType)) {
        return;
      }

      setValue(val);

      if (commitChange) {
        void storeValue(val, selectedTokenType);
      }
    },
    [storeValue, selectedTokenType]
  );

  const onTypeChange = React.useCallback(
    (newType: DataTokenType) => {
      setSelectedTokenType(newType);

      const newValue =
        value && newType === "number" && isFinite(Number(value))
          ? value
          : getDisplayValue(dataTypes[newType].defaultSerializedValue, newType);

      setValue(newValue);
      void storeValue(newValue, newType);
    },
    [value, storeValue]
  );

  return (
    <SidebarModal
      show={true}
      title={
        <>
          <Icon
            icon={TokenIcon}
            className="token-fg custom-svg-icon--lg monochrome-exempt"
          />
          <SimpleTextbox
            defaultValue={token.name}
            onValueChange={(name) =>
              studioCtx.changeUnsafe(() => {
                studioCtx.tplMgr().renameDataToken(token, name);
              })
            }
            placeholder={"(unnamed token)"}
            autoFocus={defaultEditingName}
            selectAllOnFocus={true}
            fontSize="xlarge"
            fontStyle="bold"
          />
        </>
      }
      onClose={() => onClose()}
    >
      <div className="p-xlg">
        <div className="flex-col gap-m">
          <LabeledItemRow label="Type">
            <Select
              value={selectedTokenType}
              onChange={(val) => val && onTypeChange(val as DataTokenType)}
              type="bordered"
              className="flex-fill"
            >
              {Object.keys(dataTypes).map((dataType) => (
                <Select.Option value={dataType}>
                  {dataTypes[dataType].label}
                </Select.Option>
              ))}
            </Select>
          </LabeledItemRow>

          <LabeledItemRow label="Value">
            {selectedTokenType === "code" ? (
              <CodeEditor
                title={token.name || "Data Token Value"}
                value={value}
                onChange={(val) => {
                  if (!isNil(val)) {
                    void onChange(val, true);
                  }
                }}
                lang="javascript"
                fileName={`data-token-${token.uuid}-code`}
              />
            ) : (
              <Textbox
                value={value}
                onChange={(e) => onChange(e.target.value, false)}
                onBlur={() => onChange(value, true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onChange(value, true);
                    onClose();
                  }
                }}
                placeholder={
                  selectedTokenType === "string"
                    ? "Enter text here..."
                    : dataTypes[selectedTokenType].defaultSerializedValue
                }
                autoFocus={!defaultEditingName}
                isDelayedFocus
                styleType={["bordered"]}
              />
            )}
          </LabeledItemRow>
        </div>
      </div>
    </SidebarModal>
  );
});

function getDisplayValue(storedValue: string, type: DataTokenType) {
  if (type === "string") {
    try {
      const parsed = JSON.parse(storedValue);
      if (typeof parsed === "string") {
        return parsed;
      }
    } catch (e) {
      // If it's not valid JSON, return as-is
    }
  }
  return storedValue;
}

function getStoredValue(displayValue: string, type: DataTokenType) {
  if (type === "string") {
    return JSON.stringify(displayValue);
  }
  return displayValue;
}

function isValidValue(displayValue: string, type: DataTokenType) {
  if (type === "number") {
    // Empty string is valid - we'll convert it to default value
    if (displayValue === "") {
      return true;
    }
    // Check if it's a valid number
    return isFinite(Number(displayValue));
  }
  // For "code" and "string" types, no validation during input
  return true;
}
