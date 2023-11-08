import { Tooltip } from "antd";
import * as React from "react";

export function HoverableDisclosure(props: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  const { title, children } = props;
  return (
    <Tooltip title={title}>
      <span className="hoverable-disclosure">{children}</span>
    </Tooltip>
  );
}
