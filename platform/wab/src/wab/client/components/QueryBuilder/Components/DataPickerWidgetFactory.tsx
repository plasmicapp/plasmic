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
import {
  CustomCode,
  ObjectPath,
  TemplatedString,
} from "@/wab/shared/model/classes";
import { BaseWidgetProps } from "@react-awesome-query-builder/antd";
import { Menu, Popover } from "antd";
import * as React from "react";

export interface DataPickerWidgetFactoryProps {
  widgetProps: BaseWidgetProps;
  setValue: (expr: CustomCode | ObjectPath | null | undefined) => void;
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
  data,
  schema,
  originalFactory,
  exprCtx,
}: DataPickerWidgetFactoryProps): React.ReactElement {
  const [defaultOpenDataPicker, setDefaultOpenDataPicker] =
    React.useState(false);
  const switchToDynamicValue = React.useCallback(() => {
    setDefaultOpenDataPicker(true);
    setValue(mkUndefinedObjectPath());
  }, [setDefaultOpenDataPicker]);

  const { value } = widgetProps;

  const isDynamicValue =
    value instanceof ObjectPath ||
    value instanceof CustomCode ||
    value instanceof TemplatedString;

  let contextMenu: React.ReactNode;
  let widget: React.ReactNode;
  if (isDynamicValue) {
    contextMenu = (
      <Menu>
        <Menu.Item
          id="remove-dynamic-value-btn"
          key="remove-dynamic-value"
          onClick={() => {
            setValue(undefined);
          }}
        >
          Remove dynamic value
        </Menu.Item>
      </Menu>
    );
    widget = (
      <DynamicValueWidget
        value={value}
        setValue={setValue}
        data={data}
        schema={schema}
        defaultOpenDataPicker={defaultOpenDataPicker}
        exprCtx={exprCtx}
      />
    );
  } else {
    contextMenu = (
      <Menu>
        <Menu.Item
          id="use-dynamic-value-btn"
          key="use-dynamic-value"
          onClick={switchToDynamicValue}
        >
          Use dynamic value
        </Menu.Item>
      </Menu>
    );
    widget = originalFactory(widgetProps);
  }

  return (
    <ContextMenuIndicator
      className="qb-custom-widget"
      menu={contextMenu}
      showMenuOnRightClick
      showDynamicValueButton={!isDynamicValue}
      onIndicatorClickDefault={switchToDynamicValue}
    >
      {widget}
    </ContextMenuIndicator>
  );
}

type DynamicValueWidgetProps = {
  value: ObjectPath | CustomCode | TemplatedString;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  defaultOpenDataPicker?: boolean;
  deleteIcon?: boolean;
  expectedValues?: string;
  setValue: (newVal: ObjectPath | CustomCode | null | undefined) => void;
  exprCtx: ExprCtx;
};

export function DynamicValueWidget({
  data,
  schema,
  value,
  setValue,
  defaultOpenDataPicker,
  deleteIcon = true,
  expectedValues,
  exprCtx,
}: DynamicValueWidgetProps) {
  const [popoverVisible, setPopoverVisible] = React.useState(
    defaultOpenDataPicker ?? false
  );

  const previewValue = summarizeExpr(value, exprCtx);
  const textValue = extractValueSavedFromDataPicker(value, exprCtx);

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
