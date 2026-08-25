import styles from "@/wab/client/components/sidebar-tabs/ComponentProps/DateRangeStringsEditor.module.scss";
import { DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { useMemo } from "react";

// What is a good place to define these props?
const DateRangeStringsEditor = ({
  onChange,
  value = [undefined, undefined],
  disabled,
  defaultValueHint,
}: {
  onChange: (value: [string | undefined, string | undefined]) => void;
  value: [string | undefined, string | undefined];
  disabled?: boolean;
  defaultValueHint?: [string, string];
}) => {
  const valueProp = useMemo(
    () => [
      value[0] ? dayjs(value[0]) : undefined,
      value[1] ? dayjs(value[1]) : undefined,
    ],
    [value]
  ) as [Dayjs | null, Dayjs | null];

  return (
    <DatePicker.RangePicker
      className={styles.DateRangeStringsEditor}
      value={valueProp}
      onChange={(newValue) =>
        onChange([newValue?.[0]?.toISOString(), newValue?.[1]?.toISOString()])
      }
      disabled={disabled}
      showTime
      placeholder={defaultValueHint}
      allowClear={false}
      format={"DD/MM/YYYY, hh:mm A"}
    />
  );
};

export default DateRangeStringsEditor;
