import styles from "@/wab/client/components/sidebar-tabs/ServerQuery/CustomFunctionExprPreview.module.scss";
import { ServerQueryOpPreview } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker";
import { ValuePreview } from "@/wab/client/components/sidebar-tabs/data-tab";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "@/wab/client/utils/mobx-client-util";
import { SERVER_QUERY_LOWER } from "@/wab/shared/Labels";
import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { ensure } from "@/wab/shared/common";
import {
  StatefulQueryState,
  useCustomFunctionOp,
} from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { CustomFunctionExpr } from "@/wab/shared/model/classes";
import { smartHumanize } from "@/wab/shared/strs";
import * as React from "react";

export const CustomFunctionExprPreview = observer(
  function CustomFunctionExprPreview(props: {
    expr: CustomFunctionExpr;
    title?: React.ReactNode;
    env?: Record<string, any>;
    exprCtx: ExprCtx;
  }) {
    const { expr, env, title, exprCtx } = props;
    const studioCtx = useStudioCtx();
    const [showModal, setShowModal] = React.useState(false);
    const functionId = customFunctionId(expr.func);
    const regFunc = ensure(
      studioCtx.getRegisteredFunctionsMap().get(functionId),
      `Missing registered function for ${SERVER_QUERY_LOWER}`
    );
    const { queryState } = useCustomFunctionOp(
      functionId,
      regFunc.function,
      expr,
      env,
      exprCtx
    );
    return (
      <>
        <ValuePreview
          isLoading={queryState.state !== "done"}
          val={
            queryState.state === "done"
              ? "data" in queryState
                ? queryState.data
                : queryState.error
              : undefined
          }
          onClick={() => {
            setShowModal(true);
          }}
        />
        {showModal && (
          <CustomFunctionExprPreviewModal
            queryState={queryState}
            title={title}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }
);

export function CustomFunctionExprPreviewModal(props: {
  queryState: StatefulQueryState;
  title: React.ReactNode;
  onClose: () => void;
}) {
  const { queryState, title, onClose } = props;

  return (
    <Modal
      title={title}
      onCancel={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }}
      closable
      maskClosable
      footer={null}
      open
      width={700}
      bodyStyle={{
        padding: 0,
      }}
    >
      <div
        style={{
          height: 500,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
        }}
      >
        <ServerQueryOpPreview queryState={queryState} />
      </div>
    </Modal>
  );
}

export const CustomFunctionExprSummary = observer(
  function CustomFunctionExprSummary(props: { expr: CustomFunctionExpr }) {
    const { expr } = props;
    const functionId = customFunctionId(expr.func);
    return (
      <div className={styles.customFunctionExprValue}>
        {smartHumanize(functionId)}
      </div>
    );
  }
);
