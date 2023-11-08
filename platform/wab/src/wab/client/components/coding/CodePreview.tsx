import { tryEvalExpr } from "@/wab/shared/eval";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  chromeLight,
  InspectorNodeRenderer,
  ObjectInspector,
} from "react-inspector";

const BASE_FONT_FAMILY = '"Roboto Mono", Consolas, Menlo, monospace';
const BASE_FONT_SIZE = 12;

export const CodePreview = function _CodePreview(props: {
  value: string;
  data: Record<string, any>;
  className?: string;
  opts?: {
    expandLevel?: number;
  };
}) {
  const { value, data, className, opts } = props;
  let previewValue: any | undefined = undefined;
  try {
    previewValue = tryEvalExpr(value, data).val;
    if (previewValue instanceof Window) {
      previewValue = undefined;
    }
  } catch {
    previewValue = undefined;
  }

  return (
    <div style={{ position: "absolute" }} className={className}>
      <ErrorBoundary fallback={renderInspector(undefined)}>
        {renderInspector(previewValue, opts)}
      </ErrorBoundary>
    </div>
  );
};

export function renderInspector(
  val: any,
  opts?: {
    expandLevel?: number;
    nodeRenderer?: InspectorNodeRenderer;
  }
) {
  return (
    <ObjectInspector
      theme={{
        ...chromeLight,
        BASE_BACKGROUND_COLOR: "transparent",
        BASE_FONT_FAMILY,
        BASE_FONT_SIZE: `${BASE_FONT_SIZE}px`,
        TREENODE_FONT_FAMILY: BASE_FONT_FAMILY,
        TREENODE_FONT_SIZE: `${BASE_FONT_SIZE}px`,
      }}
      data={val}
      expandLevel={opts?.expandLevel ?? 1}
      nodeRenderer={opts?.nodeRenderer}
    />
  );
}

export default CodePreview;
