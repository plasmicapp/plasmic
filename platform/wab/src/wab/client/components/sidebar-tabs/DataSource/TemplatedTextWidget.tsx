import { TextWidgetProps } from "@react-awesome-query-builder/antd";
import React from "react";
import {
  CustomCode,
  ensureKnownTemplatedString,
  ObjectPath,
  TemplatedString,
} from "@/wab/classes";
import { ExprCtx } from "@/wab/exprs";
import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import {
  TemplatedTextEditor,
  TemplatedTextEditorProps,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/TemplatedTextEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";

interface TemplatedTextWidgetProps
  extends Pick<TextWidgetProps, "value" | "readonly"> {
  setValue: (expr: TemplatedString) => void;
  placeholder?: string;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  bindings?: Record<string, TemplatedString | CustomCode | ObjectPath>;
  exprCtx: ExprCtx;
  "data-plasmic-prop"?: string;
}

export function TemplatedTextWidget(props: TemplatedTextWidgetProps) {
  const { value, bindings, setValue, ...rest } = props;
  const realValue =
    bindings && value
      ? ensureKnownTemplatedString(bindings[value])
      : new TemplatedString({ text: [] });

  return (
    <TemplatedTextEditorWithMenuIndicator
      className="templated-string-input"
      {...rest}
      onChange={setValue}
      value={realValue}
    />
  );
}

export function TemplatedTextEditorWithMenuIndicator(
  props: TemplatedTextEditorProps
) {
  return (
    <ContextMenuIndicator
      showDynamicValueButton
      tooltip={"Append dynamic value"}
      className="qb-custom-widget"
      fullWidth
    >
      <TemplatedTextEditor {...props} />
      {/*{evaluated && <ValuePreview val={evaluated.val} err={evaluated.err} />}*/}
    </ContextMenuIndicator>
  );
}
