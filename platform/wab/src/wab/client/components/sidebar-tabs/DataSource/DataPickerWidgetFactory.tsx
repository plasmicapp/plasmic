import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import "@/wab/client/components/QueryBuilder/QueryBuilder.scss";
import DataPicker, {
  DataPickerTypesSchema,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import { zIndex } from "@/wab/client/z-index";
import { cx } from "@/wab/shared/common";
import {
  ExprCtx,
  createExprForDataPickerValue,
  extractValueSavedFromDataPicker,
  summarizeExpr,
} from "@/wab/shared/core/exprs";
import { isDynamicValue } from "@/wab/shared/dynamic-bindings";
import {
  CustomCode,
  ObjectPath,
  TemplatedString,
} from "@/wab/shared/model/classes";
import { BaseWidgetProps } from "@react-awesome-query-builder/antd";
import { Popover } from "antd";
import { isString } from "lodash";
import * as React from "react";

export interface DataPickerWidgetFactoryProps {
  widgetProps: BaseWidgetProps;
  setValue: (expr: CustomCode | ObjectPath | null | undefined) => void;
  bindings?: Record<string, CustomCode | ObjectPath | TemplatedString>;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  originalFactory: (props: BaseWidgetProps) => React.ReactElement;
  exprCtx: ExprCtx;
}

export function mkUndefinedObjectPath() {
  return new ObjectPath({ path: ["undefined"], fallback: undefined });
}

export function DataPickerWidgetFactory({
  widgetProps,
  setValue,
  bindings,
  data,
  schema,
  originalFactory,
  exprCtx,
}: DataPickerWidgetFactoryProps): React.ReactElement {
  const [defaultOpenDataPicker, setDefaultOpenDataPicker] =
    React.useState(false);
  const { value } = widgetProps;

  const control =
    isString(value) && isDynamicValue(value) ? (
      <DynamicValueWidget
        value={value}
        setValue={setValue}
        bindings={bindings}
        data={data}
        schema={schema}
        defaultOpenDataPicker={defaultOpenDataPicker}
        exprCtx={exprCtx}
      />
    ) : (
      <ContextMenuIndicator
        showDynamicValueButton
        onIndicatorClickDefault={() => {
          setDefaultOpenDataPicker(true);
          setValue(mkUndefinedObjectPath());
        }}
        className="qb-custom-widget"
      >
        {originalFactory(widgetProps)}
      </ContextMenuIndicator>
    );
  return control;
}

type DynamicValueWidgetProps = {
  value: string;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  defaultOpenDataPicker?: boolean;
  deleteIcon?: boolean;
  expectedValues?: string;
  setValue: (newVal: ObjectPath | CustomCode | null | undefined) => void;
  bindings?: Record<string, ObjectPath | CustomCode | TemplatedString>;
  exprCtx: ExprCtx;
};

export function DynamicValueWidget({
  data,
  schema,
  value,
  setValue,
  bindings,
  defaultOpenDataPicker,
  deleteIcon = true,
  expectedValues,
  exprCtx,
}: DynamicValueWidgetProps) {
  const [popoverVisible, setPopoverVisible] = React.useState(
    defaultOpenDataPicker ?? false
  );

  const realValue =
    bindings && value && bindings[value]
      ? bindings[value]
      : mkUndefinedObjectPath();

  const previewValue = summarizeExpr(realValue, exprCtx);
  const textValue = extractValueSavedFromDataPicker(realValue, exprCtx);

  return (
    <Popover
      zIndex={zIndex.dataPicker}
      content={
        <DataPicker
          value={textValue}
          onChange={(val) => {
            const newVal =
              val != null ? createExprForDataPickerValue(val) : val;
            setValue(newVal);
            setPopoverVisible(false);
          }}
          onCancel={() => setPopoverVisible(false)}
          data={data}
          schema={schema}
          expectedValues={expectedValues}
        />
      }
      trigger="click"
      visible={popoverVisible}
      onVisibleChange={(_visible) => setPopoverVisible(_visible)}
      destroyTooltipOnHide={true}
      overlayClassName="data-picker-popover-overlay"
    >
      <div
        contentEditable={false}
        className={cx("nowrap", "flex", "code-editor-input")}
      >
        <span
          className={cx("text-align-left", "text-ellipsis", {
            "text-set": previewValue,
            "text-unset": !previewValue,
          })}
        >
          {previewValue ?? "unset"}
        </span>

        {deleteIcon && (
          <div className="inline-block">
            <IconLinkButton
              className={cx(["dropdown-pill__deleter", "ml-sm"])}
              onMouseDown={(e) => {
                // Using onMouseDown instead of onClick to be ahead of
                // input element's blur event.  With onClick, sometimes
                // this fires before onBlur and sometiems after, not sure
                // why...
                e.preventDefault();
                e.stopPropagation();
                setValue(undefined);
              }}
            >
              <Icon icon={CloseIcon} className="no-line-height" />
            </IconLinkButton>
          </div>
        )}
      </div>
      {/*{evaluated && <ValuePreview val={evaluated.val} err={evaluated.err} />}*/}
    </Popover>
  );
}
