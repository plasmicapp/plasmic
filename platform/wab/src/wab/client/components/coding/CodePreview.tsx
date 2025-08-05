import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { tryEvalExpr } from "@/wab/shared/eval";
import { debounce } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  chromeLight,
  InspectorNodeRenderer,
  ObjectInspector,
} from "react-inspector";

const BASE_FONT_FAMILY = '"Roboto Mono", Consolas, Menlo, monospace';
const BASE_FONT_SIZE = 12;

export type ErrorInfo = {
  name: string;
  message: string;
};

function formatError(error: any): ErrorInfo | undefined {
  if (!error) {
    return undefined;
  }
  const errorName = (typeof error === "object" && error.name) || "Error";
  const errorMessage =
    (typeof error === "object" && error.message) || "Invalid code identified";
  return { name: errorName, message: errorMessage };
}

export const CodePreview = function _CodePreview(props: {
  viewCtx?: ViewCtx;
  value: string;
  data: Record<string, any>;
  className?: string;
  opts?: {
    expandLevel?: number;
  };
}) {
  const { viewCtx, value, data, className, opts } = props;

  const evaluated = tryEvalExpr(value, data, viewCtx?.canvasCtx.win());

  const previewValue =
    evaluated.val instanceof Window ? undefined : evaluated.val;

  const [error, setError] = useState<ErrorInfo | undefined>(undefined);

  const debouncedSetError = useCallback(
    debounce((err?: ErrorInfo) => {
      setError(err);
    }, 500),
    []
  );

  useEffect(() => {
    const err = formatError(evaluated.err);
    // Clear the error immediately if it's no longer the same as the one currently displayed (which means the displayed error is possibly resolved)
    setError((prev) => (prev?.message !== err?.message ? undefined : prev));
    debouncedSetError(err);
  }, [evaluated.err]);

  return (
    <div style={{ position: "absolute" }} className={className}>
      <ErrorBoundary fallback={renderInspector(undefined)}>
        {renderInspector(previewValue, error, opts)}
      </ErrorBoundary>
    </div>
  );
};

export function renderInspector(
  val: any,
  error?: ErrorInfo,
  opts?: {
    expandLevel?: number;
    nodeRenderer?: InspectorNodeRenderer;
  }
) {
  if (error) {
    const errorName = (typeof error === "object" && error.name) || "Error";
    const errorMessage =
      (typeof error === "object" && error.message) || "Invalid code identified";
    return (
      <div className="light-error">
        <p>
          {errorName}: {errorMessage}
        </p>
      </div>
    );
  }
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
