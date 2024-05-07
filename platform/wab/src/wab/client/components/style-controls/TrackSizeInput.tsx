import styles from "@/wab/client/components/style-controls/TrackSizeInput.module.scss";
import { DimTokenSpinner } from "@/wab/client/components/widgets/DimTokenSelector";
import { maybe } from "@/wab/common";
import {
  AtomicSize,
  MinMaxSize,
  parseAtomicSize,
  showSizeCss,
  Size,
  tryParseAtomicSize,
} from "@/wab/shared/Css";
import { notification, Switch } from "antd";
import * as React from "react";

export interface TrackSizeInputProps {
  size: Size;
  onChange: (size: Size) => void;
}

function TrackSizeInput({ size, onChange }: TrackSizeInputProps) {
  const defaultText1 = showSizeCss(
    size.type === "MinMaxSize" ? size.min : size
  );
  const defaultText2 = maybe(
    size.type === "MinMaxSize" ? size.max : undefined,
    showSizeCss
  );
  const isRange = size.type === "MinMaxSize";

  function handleEdit(isInput1: boolean, val: string) {
    const proposedSize = tryParseAtomicSize(val);
    if (proposedSize === undefined) {
      notification.error({
        message: "Invalid value",
        description:
          "Must be 'auto', or a numeric value with units of fr, px or %.",
      });
      return;
    } else if (
      isInput1 &&
      size.type === "MinMaxSize" &&
      proposedSize.type === "NumericSize" &&
      proposedSize.unit === "fr"
    ) {
      notification.error({
        message: "Invalid value",
        description: "Minimal size can not be specified in fr.",
      });
      return;
    }
    const effectiveText1 = isInput1 ? val : defaultText1;
    const effectiveText2 = !isInput1 ? val : defaultText2;
    onChange(
      effectiveText2 !== undefined
        ? {
            type: "MinMaxSize",
            min: parseAtomicSize(effectiveText1),
            max: parseAtomicSize(effectiveText2),
          }
        : parseAtomicSize(effectiveText1)
    );
  }

  function handleSwitch(checked: boolean) {
    onChange(
      checked
        ? {
            type: "MinMaxSize",
            min: {
              type: "NumericSize",
              num: 100,
              unit: "px",
            },
            max: size as AtomicSize,
          }
        : (size as MinMaxSize).max
    );
  }

  return (
    <div className={styles.trackSizeInput}>
      <div className={styles.vcenter}>
        <Switch size={"small"} checked={isRange} onChange={handleSwitch} />
      </div>
      <div className={styles.vcenter}>Min-max range</div>
      <div className={styles.label}>
        {defaultText2 !== undefined ? "Min" : "Size"}
      </div>

      <DimTokenSpinner
        onChange={(val) => handleEdit(true, val || "")}
        value={defaultText1}
        allowedUnits={["px", "%", "fr"]}
      />
      {defaultText2 !== undefined && (
        <>
          <div className={styles.label}>Max</div>

          <DimTokenSpinner
            onChange={(val) => handleEdit(false, val || "")}
            value={defaultText2}
            allowedUnits={["px", "%", "fr"]}
          />
        </>
      )}
    </div>
  );
}

export default React.memo(TrackSizeInput);
