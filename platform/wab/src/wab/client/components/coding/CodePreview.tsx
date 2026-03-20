import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { tryEvalExpr } from "@/wab/shared/eval";
import L, { debounce } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  InspectorNodeRenderer,
  ObjectInspector,
  chromeLight,
} from "react-inspector";

const BASE_FONT_FAMILY = '"Roboto Mono", Consolas, Menlo, monospace';
const BASE_FONT_SIZE = 12;

/**
 * Format error in this order:
 *  {
 *    name: "Error"
 *    message: "foo",
 *    aKey: 1,
 *    zKey: 2,
 *    stack: [...]
 *    cause: { ... }
 *  }
 * @param error
 */
function formatError(error: Error): Partial<Error> {
  const formatted = {};

  const keys = new Set(Object.getOwnPropertyNames(error));

  if (keys.delete("name") || "name" in error) {
    formatted["name"] = error["name"];
  }
  if (keys.delete("message") || "message" in error) {
    formatted["message"] = error["message"];
  }

  const hasStack = keys.delete("stack") || "stack" in error;
  const hasCause = keys.delete("cause") || "cause" in error;

  for (const key of Array.from(keys).sort()) {
    formatted[key] = error[key];
  }

  if (hasStack) {
    formatted["stack"] = error["stack"];
  }
  if (hasCause) {
    // L.isError handles cross-frame Errors
    formatted["cause"] = L.isError(error["stack"])
      ? formatError(error["stack"])
      : error["stack"];
  }

  return formatted;
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

  const [error, setError] = useState<Partial<Error> | undefined>(undefined);

  const debouncedSetError = useCallback(
    debounce((err: Partial<Error> | undefined) => {
      setError(err);
    }, 500),
    []
  );

  useEffect(() => {
    if (!L.isError(evaluated.err)) {
      setError(undefined);
      return;
    }

    const err = formatError(evaluated.err);
    // Clear the error immediately if it's no longer the same as the one currently displayed (which means the displayed error is possibly resolved)
    setError((prev) => (prev?.message !== err?.message ? undefined : prev));
    debouncedSetError(err);
    return () => {
      debouncedSetError.cancel();
    };
  }, [evaluated.err]);

  return (
    <ValuePreview
      className={className}
      val={error ?? previewValue}
      opts={opts}
    />
  );
};

export function ValuePreview({
  val,
  className,
  opts,
}: {
  val: any;
  className?: string;
  opts?: {
    expandLevel?: number;
    expandPaths?: string[];
  };
}) {
  return (
    <div style={{ position: "absolute" }} className={className}>
      <ErrorBoundary fallback={renderInspector(undefined)}>
        {renderInspector(val, opts)}
      </ErrorBoundary>
    </div>
  );
}

export function renderInspector(
  val: any,
  opts?: {
    expandLevel?: number;
    expandPaths?: string[];
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
      data={L.isError(val) ? formatError(val) : val}
      expandLevel={opts?.expandPaths ? undefined : opts?.expandLevel ?? 1}
      expandPaths={opts?.expandPaths}
      nodeRenderer={opts?.nodeRenderer}
    />
  );
}

export default CodePreview;
