import {
  CustomFunctionExprPreview,
  CustomFunctionExprSummary,
} from "@/wab/client/components/sidebar-tabs/ServerQuery/CustomFunctionExprPreview";
import { useServerQueryBottomModal } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryBottomModal";
import Button from "@/wab/client/components/widgets/Button";
import { extractDataCtx } from "@/wab/client/state-management/interactions-meta";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { observer } from "@/wab/client/utils/mobx-client-util";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { EventHandlerKeyType } from "@/wab/shared/core/tpls";
import {
  Component,
  CustomFunctionExpr,
  Interaction,
  TplNode,
} from "@/wab/shared/model/classes";
import * as React from "react";

/**
 * DataSourceOpPicker takes a `env` OR a tuple `{ viewCtx, tpl,
 * eventHandlerKey }` which the bottom modal uses to get the canvas
 * env. The latter is preferred because with the former the modal
 * does not react to changes in canvas env.
 */
type CustomFunctionEditorProps = {
  queryKey: string;
  queryName?: string;
  value?: CustomFunctionExpr;
  shouldOpenModal?: boolean;
  onChange: (value: CustomFunctionExpr) => void;
  onClose?: () => void;
  allowedOps?: string[];
  component?: Component;
  interaction?: Interaction;
} & (
  | {
      env: Record<string, any> | undefined;
    }
  | {
      viewCtx: ViewCtx | undefined;
      tpl: TplNode | undefined;
      eventHandlerKey: EventHandlerKeyType | undefined;
    }
);

export const CustomFunctionEditor = observer(
  (props: CustomFunctionEditorProps) => {
    const {
      queryKey,
      value,
      onChange,
      onClose,
      allowedOps,
      component,
      ...rest
    } = props;
    const { open, close } = useServerQueryBottomModal(queryKey);
    const studioCtx = useStudioCtx();
    const exprCtx: ExprCtx = {
      projectFlags: studioCtx.projectFlags(),
      component: component ?? null,
      inStudio: true,
    };

    const env =
      "env" in props
        ? props.env
        : props.viewCtx && props.tpl
        ? extractDataCtx(
            props.viewCtx,
            props.tpl,
            undefined,
            props.interaction,
            props.eventHandlerKey
          )
        : undefined;

    return (
      <div className="flex-col fill-width">
        <Button
          id="configure-operation-btn"
          type="leftAligned"
          onClick={() => {
            open({
              value,
              onSave: (newExpr) => {
                onChange(newExpr);
                close();
                onClose?.();
              },
              onCancel: () => {
                close();
                onClose?.();
              },
              allowedOps,
              exprCtx,
              ...rest,
            });
            studioCtx.tourActionEvents.dispatch({
              type: TutorialEventsType.ConfigureDataOperation,
            });
          }}
          data-plasmic-prop="data-source-open-modal-btn"
        >
          {!value ? (
            "Configure an operation"
          ) : (
            <CustomFunctionExprSummary expr={value} />
          )}
        </Button>
        {value && (
          <CustomFunctionExprPreview expr={value} env={env} exprCtx={exprCtx} />
        )}
      </div>
    );
  }
);
