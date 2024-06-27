import { ObserverLoadable } from "@/wab/client/components/widgets";
import { stripParens } from "@/wab/shared/core/exprs";
import { Size } from "@/wab/shared/geom";
import { Type } from "@/wab/shared/model/classes";
import React, { useState } from "react";

let divSizer: HTMLDivElement | undefined = undefined;
export function measureContentSize(
  content: string,
  classes: string[] = []
): Size {
  if (!divSizer) {
    divSizer = document.createElement("div");
    divSizer.classList.add("ContentSizer");
    divSizer.classList.add(...classes);
    document.body.appendChild(divSizer);
  }
  if (content.endsWith("\n")) {
    // If content ends with a newline, the size of that newline doesn't
    // get reflected unless we tack on another newline
    content += "\n";
  }
  // Use non-breaking spaces so that trailing spaces prop up the width.
  content = content.replace(/ $|^$/g, "\xa0");
  divSizer.innerText = content;
  const { width, height } = divSizer.getBoundingClientRect();
  return { width, height };
}

export interface ExprInputProps {
  value?: string;
  onChange?: (val: string | undefined) => void;
  expectedType?: Type;
  onCancel?: () => void;
  onTentativeChange?: (value: string) => void;
}

function maybeParenthesize<T>(text: string, ifEmpty: T): string | T {
  return text.trim() ? `(${text})` : ifEmpty;
}

export function ExprInput({
  value,
  onChange,
  onCancel,
  expectedType,
  onTentativeChange,
}: ExprInputProps) {
  const [size, setSize] = useState<Size>(measureCodeContentSize(value || ""));

  function measureCodeContentSize(text: string) {
    return measureContentSize(text, ["ExprContent"]);
  }

  return (
    <div className={"ExprInput"}>
      <ObserverLoadable
        loader={() =>
          import("@/wab/client/components/coding/CodeInput").then(
            ({ CodeInput }) => CodeInput
          )
        }
        contents={(CodeInput) => (
          <CodeInput
            preamble={""}
            defaultCode={stripParens(value || "")}
            size={{ height: size.height }}
            onSubmit={(text) => {
              if (onChange) {
                onChange(maybeParenthesize(text, undefined));
              }
            }}
            onChange={(text) => {
              setSize(measureCodeContentSize(text));
              if (onTentativeChange) {
                onTentativeChange(maybeParenthesize(text, ""));
              }
            }}
            onCancel={onCancel}
          />
        )}
      />
    </div>
  );
}
