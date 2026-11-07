import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import {
  TemplatedTextEditor,
  TemplatedTextEditorProps,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/TemplatedTextEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { ExprCtx } from "@/wab/shared/core/exprs";
import {
  CustomCode,
  ObjectPath,
  TemplatedString,
  ensureKnownTemplatedString,
} from "@/wab/shared/model/classes";
import { TextWidgetProps } from "@react-awesome-query-builder/antd";
import React from "react";

interface TemplatedTextWidgetProps extends Pick<
  TextWidgetProps,
  "value" | "readonly"
> {
  setValue: (expr: TemplatedString) => void;
  placeholder?: string;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  bindings?: Record<string, TemplatedString | CustomCode | ObjectPath>;
  exprCtx: ExprCtx;
  "data-plasmic-prop"?: string;
}

export function TemplatedTextWidget(props: TemplatedTextWidgetProps) {
  const { value, bindings, setValue, readonly, ...rest } = props;
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
      disabled={readonly}
    />
  );
}

export function TemplatedTextEditorWithMenuIndicator(
  props: TemplatedTextEditorProps,
) {
  const emptyValue = React.useMemo(() => new TemplatedString({ text: [] }), []);
  return (
    <ContextMenuIndicator
      showDynamicValueButton={!props.readOnly && !props.disabled}
      tooltip={"Append dynamic value"}
      className="qb-custom-widget"
      fullWidth
    >
      <TemplatedTextEditor {...props} value={props.value ?? emptyValue} />
      {/*{evaluated && <ValuePreview val={evaluated.val} err={evaluated.err} />}*/}
    </ContextMenuIndicator>
  );
}
