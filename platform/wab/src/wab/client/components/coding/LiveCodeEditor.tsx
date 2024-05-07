import { ValueViewer } from "@/wab/client/components/coding/ValueViewer";
import { ObserverLoadable } from "@/wab/client/components/widgets";
import { Dict } from "@/wab/collections";
import { tryCatchElse } from "@/wab/common";
import { evalExprInSandbox } from "@/wab/shared/eval";
import React, { useEffect, useMemo, useState } from "react";

export type EnvDict = Dict<unknown>;

function serializeForCodeEditor(varName: string, value: unknown) {
  const finalValue = tryCatchElse({
    try: () => JSON.stringify(value),
    catch: () => {
      // TODO Not everything can be serialized as JSON. Best-effort walk the structure to get the Typescript types.
      return "undefined";
    },
  });
  return `const ${varName} = (${finalValue});`;
}

function serializeEnvForCodeEditor(env: EnvDict) {
  return Object.entries(env)
    .map(([name, val]) => serializeForCodeEditor(name, val))
    .join("\n");
}

/**
 * A "live coding" environment - a code editor with a live preview.
 */
export function LiveCodeEditor({
  env,
  defaultCode,
  onChange,
  onSubmit,
  onCancel,
}: {
  env: EnvDict;
  defaultCode: string;
  onChange?: (code: string) => void;
  onSubmit?: (code: string) => void;
  onCancel?: () => void;
}) {
  const [code, setCode] = useState(defaultCode);
  const [value, setValue] = useState(undefined);
  const preamble = useMemo(() => serializeEnvForCodeEditor(env), [env]);
  // TODO Throttle/debounce adaptively - if slow to compute, then wait longer for typing to settle.
  useEffect(() => {
    tryCatchElse({
      try: () => evalExprInSandbox(code, env),
      catch: () => {},
      else: (v) => setValue(() => v),
    });
  }, [code, env]);
  return (
    <div className={"flex-row"}>
      <div style={{ height: 200, width: "50%" }}>
        <ObserverLoadable
          loader={() =>
            import("@/wab/client/components/coding/CodeInput").then(
              ({ CodeInput }) => CodeInput
            )
          }
          contents={(CodeInput) => (
            <CodeInput
              preamble={preamble}
              defaultCode={defaultCode}
              onChange={(v) => {
                setCode(v);
                onChange?.(v);
              }}
              onSubmit={onSubmit}
              onCancel={onCancel}
            />
          )}
        />
      </div>
      <div style={{ width: "50%" }}>
        <ValueViewer value={value} />
      </div>
    </div>
  );
}
