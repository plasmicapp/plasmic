import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import "@/wab/client/components/QueryBuilder/QueryBuilder.scss";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  DataPickerTrigger,
  DataPickerTriggerHandle,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
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
  isKnownCustomCode,
  isKnownObjectPath,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
import { WidgetProps } from "@react-awesome-query-builder/antd";
import { Menu } from "antd";
import * as React from "react";

export interface DataPickerWidgetFactoryProps {
  widgetProps: WidgetProps;
  setValue: (expr: CustomCode | ObjectPath | null | undefined) => void;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  renderOriginalWidget: () => React.ReactElement;
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
  renderOriginalWidget,
  exprCtx,
}: DataPickerWidgetFactoryProps): React.ReactElement {
  const [defaultOpenDataPicker, setDefaultOpenDataPicker] =
    React.useState(false);
  const switchToDynamicValue = React.useCallback(() => {
    setDefaultOpenDataPicker(true);
    setValue(mkUndefinedObjectPath());
  }, [setDefaultOpenDataPicker]);

  const { value, readonly } = widgetProps;

  const isDynamicValue =
    isKnownObjectPath(value) ||
    isKnownCustomCode(value) ||
    isKnownTemplatedString(value);

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
        disabled={readonly}
        title={
          typeof widgetProps.field === "string" ? widgetProps.field : undefined
        }
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
    widget = renderOriginalWidget();
  }

  if (readonly) {
    return <div className="qb-custom-widget">{widget}</div>;
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
  disabled?: boolean;
  /** Names the field in the panel's tab. */
  title?: string;
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
  disabled,
  title,
}: DynamicValueWidgetProps) {
  const [popoverVisible, setPopoverVisible] = React.useState(
    defaultOpenDataPicker ?? false,
  );

  const pickerRef = React.useRef<DataPickerTriggerHandle>(null);
  React.useEffect(() => {
    if (defaultOpenDataPicker) {
      pickerRef.current?.open();
    }
  }, []);

  const previewValue = summarizeExpr(value, exprCtx);
  const textValue = extractValueSavedFromDataPicker(value, exprCtx);

  return (
    <DataPickerTrigger
      ref={pickerRef}
      visible={!disabled && popoverVisible}
      setVisible={setPopoverVisible}
      title={title ?? "Dynamic value"}
      picker={{
        value: textValue,
        onChange: (val) => {
          const newVal = val != null ? createExprForDataPickerValue(val) : val;
          setValue(newVal);
          setPopoverVisible(false);
        },
        onCancel: () => setPopoverVisible(false),
        data,
        schema,
        expectedValues,
      }}
    >
      <div
        contentEditable={false}
        className={cx("nowrap", "flex", "code-editor-input")}
        onClick={() => pickerRef.current?.open()}
      >
        <span
          className={cx("text-align-left", "text-ellipsis", {
            "text-set": previewValue,
            "text-unset": !previewValue,
          })}
        >
          {previewValue ?? "unset"}
        </span>

        {deleteIcon && !disabled && (
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
    </DataPickerTrigger>
  );
}
