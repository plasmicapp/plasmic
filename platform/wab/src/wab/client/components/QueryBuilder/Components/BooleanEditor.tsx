import { BooleanWidget } from "@react-awesome-query-builder/antd";
import Segmented from "antd/lib/segmented";
import React from "react";

type Props = Exclude<Parameters<BooleanWidget["factory"]>[0], undefined>;

function TrueIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      height={16}
      width={16}
      style={{ fill: "currentcolor" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.416 5.876a.75.75 0 0 1 .208 1.04L11.42 17.721a1.75 1.75 0 0 1-2.871.06l-3.156-4.34a.75.75 0 1 1 1.214-.882l3.155 4.339a.25.25 0 0 0 .41-.009l7.204-10.805a.75.75 0 0 1 1.04-.208z"
        fill="currentColor"
      />
    </svg>
  );
}

function FalseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      height={16}
      width={16}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="m17.25 6.75-10.5 10.5m0-10.5 10.5 10.5"
      />
    </svg>
  );
}

export function BooleanEditor(props: Props) {
  const { value, setValue } = props;

  return (
    <Segmented
      value={value != null ? (value ? "yes" : "no") : "invalid"}
      size="small"
      style={{ alignSelf: "start" }}
      onChange={(newValue) => setValue(newValue === "yes")}
      options={[
        {
          value: "yes",
          icon: <TrueIcon />,
        },
        {
          value: "no",
          icon: <FalseIcon />,
        },
      ]}
    />
  );
}
