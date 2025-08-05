import { useBottomModalActions } from "@/wab/client/components/BottomModal";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { ServerQueryOpExprFormAndPreview } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker";
import { extractDataCtx } from "@/wab/client/state-management/interactions-meta";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { EventHandlerKeyType } from "@/wab/shared/core/tpls";
import {
  ComponentServerQuery,
  CustomFunctionExpr,
  Interaction,
  TplNode,
} from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import * as React from "react";

interface ServerQueryOpExprBottomModalContentProps {
  value?: CustomFunctionExpr;
  onSave: (expr: CustomFunctionExpr, opExprName?: string) => unknown;
  onCancel: () => unknown;
  readOnly?: boolean;
  env?: Record<string, any>;
  allowedOps?: string[];
  exprCtx: ExprCtx;
  interaction?: Interaction;
  viewCtx?: ViewCtx;
  tpl?: TplNode;
  schema?: DataPickerTypesSchema;
  parent?: ComponentServerQuery | TplNode;
  eventHandlerKey?: EventHandlerKeyType;
}

/** For managing a single query modal with a known query key. */
export function useServerQueryBottomModal(queryKey: string) {
  const serverQueryModals = useServerQueryBottomModals();
  return {
    open: (
      props: {
        title?: string;
      } & ServerQueryOpExprBottomModalContentProps
    ) => {
      serverQueryModals.open(queryKey, props);
    },
    close: () => {
      serverQueryModals.close(queryKey);
    },
  };
}

/** For managing multiple query modals or an unknown/dynamic query. */
export function useServerQueryBottomModals() {
  // const ctx = useDataSourceOpPickerContext();
  const modalActions = useBottomModalActions();
  return {
    open: (
      queryKey: string,
      {
        title,
        ...props
      }: {
        title?: string;
      } & ServerQueryOpExprBottomModalContentProps
    ) => {
      modalActions.open(queryKey, {
        title: title || `Configure server query`,
        children: <ServerQueryOpExprBottomModalContent {...props} />,
      });
    },
    close: (queryKey: string) => {
      modalActions.close(queryKey);
    },
  };
}

const ServerQueryOpExprBottomModalContent = observer(
  function ServerQueryOpExprBottomModalContent({
    value,
    onSave,
    onCancel,
    readOnly,
    schema,
    parent,
    allowedOps,
    interaction,
    exprCtx,
    viewCtx,
    tpl,
    eventHandlerKey,
    ...rest
  }: ServerQueryOpExprBottomModalContentProps) {
    const wrappedOnSave = React.useCallback(
      (newExpr: CustomFunctionExpr, opExprName?: string) => {
        onSave(newExpr, opExprName);
      },
      [onSave]
    );

    const env = rest.env
      ? rest.env
      : viewCtx && tpl
      ? extractDataCtx(viewCtx, tpl, undefined, interaction, eventHandlerKey)
      : undefined;

    return (
      <ServerQueryOpExprFormAndPreview
        value={value}
        onSave={wrappedOnSave}
        onCancel={onCancel}
        env={env}
        schema={schema}
        parent={parent}
        readOnly={readOnly}
        allowedOps={allowedOps}
        exprCtx={exprCtx}
        interaction={interaction}
      />
    );
  }
);
