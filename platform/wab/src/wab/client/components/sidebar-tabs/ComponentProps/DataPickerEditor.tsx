import DataPicker, {
  DataPickerTypesSchema,
  InitialMode,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { RightTabKey } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { toVarName } from "@/wab/shared/codegen/util";
import { isNonNil, mkShortId, spawn, uniqueName } from "@/wab/shared/common";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import { ComponentDataQuery } from "@/wab/shared/model/classes";
import { Popover, Tooltip } from "antd";
import { default as classNames } from "classnames";
import { observer } from "mobx-react";
import React from "react";

interface DataPickerEditorProps {
  value: (string | number)[] | string | null | undefined;
  onChange: (value: (string | number)[] | string | null | undefined) => void;
  viewCtx?: ViewCtx;
  data?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  flatten?: boolean;
  onUnlink?: () => void;
  isDisabled?: boolean;
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
  hideStateSwitch?: boolean;
  autoFocus?: boolean;
  alwaysShowValuePathAsLabel?: boolean;
  "data-plasmic-prop"?: string;
  expectedValues?: string;
  initialMode?: InitialMode;
  onAddVariableBtnClick?: () => void;
  hidePreview?: boolean;
  // A brief description of what the expression is supposed to be used for
  context?: string;
  isRunCodeInteraction?: boolean;
  onRunClick?: (value: string) => void;
}

export const InternalDataPickerEditor = observer(
  function InternalDataPickerEditor_(
    props: DataPickerEditorProps & {
      visible: boolean;
      setVisible: (value: boolean) => void;
    }
  ) {
    const {
      value,
      onChange,
      visible,
      setVisible,
      viewCtx,
      data,
      schema,
      flatten,
      onUnlink,
      isDisabled,
      disabledTooltip,
      hideStateSwitch,
      autoFocus,
      alwaysShowValuePathAsLabel,
      expectedValues,
      initialMode,
      onAddVariableBtnClick,
      hidePreview,
      context,
      isRunCodeInteraction,
      onRunClick,
    } = props;
    const firstRenderRef = React.useRef(true);
    React.useLayoutEffect(() => {
      if (!firstRenderRef.current) {
        setVisible(false);
        return;
      }
      firstRenderRef.current = false;
    }, [viewCtx?.focusedTpl(), viewCtx?.focusedCloneKey()]);
    const autoFocusCallback = React.useCallback(
      (divElement: HTMLDivElement) => {
        if (divElement) {
          divElement.focus();
        }
      },
      []
    );
    const codeExpr =
      typeof value === "object" && value ? pathToString(value) : value;
    const evaluatedValue: string | null | undefined = codeExpr;

    // if (codeExpr) {
    //   const evalExpr = data && tryEvalExpr(codeExpr as string, data);
    //   if (
    //     (typeof value === "object" && alwaysShowValuePathAsLabel) ||
    //     !evalExpr?.val ||
    //     typeof evalExpr.val === "object" ||
    //     typeof evalExpr.val === "function"
    //   ) {
    //     evaluatedValue =
    //       value && Array.isArray(value) ? summarizePathParts(value) : value;
    //   } else {
    //     evaluatedValue = swallow(() =>
    //       JSON.stringify(evalExpr.val, undefined, undefined)
    //     );
    //   }
    // } else {
    //   evaluatedValue = codeExpr;
    // }

    return (
      <Popover
        content={
          <DataPicker
            value={value}
            onChange={(val) => {
              onChange(val);
              setVisible(false);
            }}
            onRunClick={onRunClick}
            onCancel={() => setVisible(false)}
            data={data}
            schema={schema}
            flatten={flatten}
            hideStateSwitch={hideStateSwitch}
            onUnlink={
              onUnlink
                ? () => {
                    onUnlink();
                    setVisible(false);
                  }
                : undefined
            }
            expectedValues={expectedValues}
            initialMode={initialMode}
            withAddQuery={!!viewCtx}
            hidePreview={hidePreview}
            onAddQuery={() => {
              if (viewCtx) {
                spawn(
                  viewCtx.studioCtx.change(({ success }) => {
                    const component = viewCtx.currentTplComponent().component;
                    const newQuery = new ComponentDataQuery({
                      uuid: mkShortId(),
                      name: toVarName(
                        uniqueName(
                          component.dataQueries.map((q) => q.name),
                          "componentData",
                          {
                            normalize: toVarName,
                          }
                        )
                      ),
                      op: undefined,
                    });
                    component.dataQueries.push(newQuery);
                    viewCtx.studioCtx.switchRightTab(RightTabKey.component);
                    viewCtx.studioCtx.newlyAddedQuery = newQuery;
                    setVisible(false);
                    return success();
                  })
                );
              }
            }}
            onAddVariableBtnClick={onAddVariableBtnClick}
            context={context}
            isRunCodeInteraction={isRunCodeInteraction}
          />
        }
        trigger="click"
        visible={!isDisabled && visible}
        onVisibleChange={(_visible) => {
          if (viewCtx?.studioCtx.onboardingTourState.flags.keepDataPickerOpen) {
            return;
          }
          setVisible(_visible);
        }}
        destroyTooltipOnHide={true}
        overlayClassName="data-picker-popover-overlay"
      >
        <div
          ref={autoFocus ? autoFocusCallback : undefined}
          className="code-editor-input"
          data-plasmic-prop={props["data-plasmic-prop"]}
          tabIndex={0}
        >
          <Tooltip title={isDisabled && disabledTooltip}>
            <span
              className={classNames("text-align-left", {
                "text-set": evaluatedValue,
                "text-unset": !evaluatedValue,
              })}
            >
              {evaluatedValue ?? "unset"}
            </span>
          </Tooltip>
        </div>
      </Popover>
    );
  }
);

export const DataPickerEditor = observer(function DataPickerEditor_(
  props: DataPickerEditorProps & {
    visible?: boolean;
    setVisible?: (value: boolean) => void;
  }
) {
  const {
    visible: externalVisible,
    setVisible: externalSetVisible,
    ...rest
  } = props;

  const [visible, setVisible] = React.useState(false);

  const getVisible = () => {
    return isNonNil(externalVisible) ? externalVisible : visible;
  };

  const getSetVisible = () => {
    return isNonNil(externalSetVisible) ? externalSetVisible : setVisible;
  };

  return (
    <InternalDataPickerEditor
      visible={getVisible()}
      setVisible={getSetVisible()}
      {...rest}
    />
  );
});
