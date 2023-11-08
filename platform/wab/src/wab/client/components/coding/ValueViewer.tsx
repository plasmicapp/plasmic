import React from "react";
import Inspector from "react-inspector";

export function ValueViewer({
  value,
  expandFully = false,
}: {
  value: unknown;
  expandFully?: boolean;
}) {
  return <Inspector data={value} expandLevel={expandFully ? 99 : undefined} />;
}

export default ValueViewer;
