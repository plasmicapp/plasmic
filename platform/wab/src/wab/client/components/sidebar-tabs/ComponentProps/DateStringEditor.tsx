import styles from "@/wab/client/components/sidebar-tabs/ComponentProps/DateStringEditor.module.scss";
import { DatePicker } from "antd";
import moment from "moment";
import React from "react";

const DateStringEditor = ({
  onChange,
  value,
  disabled,
  defaultValueHint,
  "data-plasmic-prop": dataPlasmicProp,
}: {
  onChange: (value: string | undefined) => void;
  value?: string;
  disabled?: boolean;
  defaultValueHint?: string;
  "data-plasmic-prop"?: string;
}) => (
  <DatePicker
    className={styles.DateStringEditor}
    value={value && moment(value).isValid() ? moment(value) : null}
    onChange={(newValue) => onChange(newValue?.toISOString())}
    disabled={disabled}
    placeholder={defaultValueHint}
    showTime
    allowClear={false}
    format={"DD/MM/YYYY, hh:mm A"}
    data-plasmic-prop={dataPlasmicProp}
  />
);

export default DateStringEditor;
