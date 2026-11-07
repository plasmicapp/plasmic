import {
  BindingIdentity,
  isBindingTarget,
} from "@/wab/client/components/editor-sessions/binding-session";
import {
  DataPickerTypesSchema,
  InitialMode,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  DataPickerTrigger,
  DataPickerTriggerHandle,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel";
import { RightTabKey } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { addEmptyQuery } from "@/wab/shared/TplMgr";
import { isNonNil, spawn } from "@/wab/shared/common";
import { summarizeTpl } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  pathToDisplayString,
  transformDataTokensToDisplay,
} from "@/wab/shared/eval/expression-parser";
import { Tooltip } from "antd";
import { default as classNames } from "classnames";
import { observer } from "mobx-react";
import { ok } from "neverthrow";
import React from "react";

interface DataPickerEditorProps {
  value: (string | number)[] | string | null | undefined;
  onChange?: (value: (string | number)[] | string | null | undefined) => void;
  viewCtx?: ViewCtx;
  data?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  onUnlink?: () => void;
  isDisabled?: boolean;
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
  hideStateSwitch?: boolean;
  autoFocus?: boolean;
  alwaysShowValuePathAsLabel?: boolean;
  /** Names the field in the panel's tab, e.g. the prop's label. */
  title?: string;
  "data-plasmic-prop"?: string;
  expectedValues?: string;
  initialMode?: InitialMode;
  onAddVariableBtnClick?: () => void;
  hidePreview?: boolean;
  forDataRepCollection?: boolean;
  target?: BindingIdentity;
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
    },
  ) {
    const {
      value,
      onChange,
      visible,
      setVisible,
      viewCtx,
      data,
      schema,
      onUnlink,
      isDisabled,
      disabledTooltip,
      hideStateSwitch,
      autoFocus,
      expectedValues,
      initialMode,
      onAddVariableBtnClick,
      hidePreview,
      context,
      isRunCodeInteraction,
      onRunClick,
    } = props;
    const target = isBindingTarget(props.target) ? props.target : undefined;
    const write = target?.write ?? onChange;
    const unlink = target?.unlink ?? onUnlink;
    const pickerRef = React.useRef<DataPickerTriggerHandle>(null);
    React.useEffect(() => {
      if (DEVFLAGS.dockview && visible && !isDisabled) {
        pickerRef.current?.open();
        setVisible(false);
      }
    }, [visible, isDisabled]);
    const firstRenderRef = React.useRef(true);
    React.useLayoutEffect(() => {
      if (!DEVFLAGS.dockview && !firstRenderRef.current) {
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
      [],
    );
    const displayValue =
      viewCtx && typeof value === "string"
        ? transformDataTokensToDisplay(value, viewCtx.site, viewCtx.siteInfo.id)
        : value;
    const codeExpr: string | (string | number)[] | null | undefined =
      typeof displayValue === "object" && displayValue && viewCtx
        ? pathToDisplayString(displayValue, viewCtx.site, viewCtx.siteInfo.id)
        : displayValue;

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

    const focusedTpl = viewCtx?.focusedTpl();
    const panelTitle =
      props.title ||
      (focusedTpl ? summarizeTpl(focusedTpl) : undefined) ||
      "Dynamic value";

    return (
      <DataPickerTrigger
        ref={pickerRef}
        visible={!isDisabled && visible}
        setVisible={setVisible}
        title={panelTitle}
        picker={{
          value: target ? target.value() : displayValue,
          viewCtx,
          target: props.target,
          forDataRepCollection: props.forDataRepCollection,
          onChange: (val) => {
            write?.(val);
            if (!DEVFLAGS.dockview) {
              setVisible(false);
            }
          },
          onRunClick,
          onCancel: () => setVisible(false),
          data,
          schema,
          hideStateSwitch,
          onUnlink: unlink
            ? () => {
                if (target && viewCtx) {
                  viewCtx.studioCtx.changeSpawn(unlink);
                } else {
                  unlink();
                }
                if (!DEVFLAGS.dockview) {
                  setVisible(false);
                }
              }
            : undefined,
          expectedValues,
          initialMode,
          withAddQuery:
            !!viewCtx &&
            (DEVFLAGS.dockview ||
              viewCtx.studioCtx.appCtx.appConfig.enableDataQueries),
          hidePreview,
          onAddQuery: () => {
            if (viewCtx) {
              spawn(
                viewCtx.studioCtx.change(() => {
                  const component = viewCtx.currentTplComponent().component;
                  if (DEVFLAGS.dockview) {
                    viewCtx.studioCtx.newlyAddedQuery = viewCtx.studioCtx
                      .tplMgr()
                      .addComponentServerQuery(component);
                  } else {
                    viewCtx.studioCtx.newlyAddedQuery = addEmptyQuery(
                      component,
                      "componentData",
                    );
                  }
                  viewCtx.studioCtx.switchRightTab(RightTabKey.component);
                  setVisible(false);
                  return ok();
                }),
              );
            }
          },
          onAddVariableBtnClick,
          context,
          isRunCodeInteraction,
        }}
      >
        <div
          ref={autoFocus ? autoFocusCallback : undefined}
          className="code-editor-input"
          data-plasmic-prop={props["data-plasmic-prop"]}
          tabIndex={0}
          onClick={
            DEVFLAGS.dockview
              ? () => {
                  if (!isDisabled) {
                    pickerRef.current?.open();
                  }
                }
              : undefined
          }
        >
          <Tooltip title={isDisabled && disabledTooltip}>
            <span
              className={classNames("text-align-left", {
                "text-set": codeExpr,
                "text-unset": !codeExpr,
              })}
            >
              {codeExpr ?? "unset"}
            </span>
          </Tooltip>
        </div>
      </DataPickerTrigger>
    );
  },
);

export const DataPickerEditor = observer(function DataPickerEditor_(
  props: DataPickerEditorProps & {
    visible?: boolean;
    setVisible?: (value: boolean) => void;
  },
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
