import Select from "antd/lib/select";
import React from "react";

type Props = {
  items: Array<{
    label: string;
    key: string;
  }>;
  value: string | undefined;
  onValueChanged: (newSelectedKey: string) => void;
  hideArrow?: boolean;
  className?: string;
};

function SelectInputArrow() {
  return (
    <div className="select-arrow">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        height="24"
        width="24"
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M15.25 10.75L12 14.25l-3.25-3.5"
        />
      </svg>
    </div>
  );
}

const SELECT_INPUT_MIN_WIDTH = 100;

export function SelectInput(props: Props) {
  const { items, value, onValueChanged, hideArrow, className = "" } = props;

  return (
    <Select
      className={`plasmic-query-builder-select ${className}`}
      value={value}
      onChange={onValueChanged}
      size={"small"}
      bordered={true}
      suffixIcon={<SelectInputArrow />}
      dropdownMatchSelectWidth={false}
      showArrow={!hideArrow}
      style={{
        minWidth: SELECT_INPUT_MIN_WIDTH,
      }}
    >
      {items.map((item) => {
        return (
          <Select.Option className="qb-select-option" key={item.key}>
            {item.label}
          </Select.Option>
        );
      })}
    </Select>
  );
}
