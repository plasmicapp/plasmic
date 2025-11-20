import styles from "@/wab/client/components/sidebar-tabs/ServerQuery/CustomFunctionExprPreview.module.scss";
import { ServerQueryOpPreview } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker";
import { ValuePreview } from "@/wab/client/components/sidebar-tabs/data-tab";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "@/wab/client/utils/mobx-client-util";
import { SERVER_QUERY_LOWER } from "@/wab/shared/Labels";
import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { ensure } from "@/wab/shared/common";
import { useCustomFunctionOp } from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { CustomFunctionExpr } from "@/wab/shared/model/classes";
import { smartHumanize } from "@/wab/shared/strs";
import type { ServerQueryResult } from "@plasmicapp/react-web/lib/data-sources";
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
    const result = useCustomFunctionOp(regFunc.function, expr, env, exprCtx);

    if (!result) {
      return null;
    } else if (result.isLoading) {
      return <ValuePreview isLoading />;
    } else if (result.data) {
      return (
        <>
          <ValuePreview
            val={result.data}
            onClick={() => {
              setShowModal(true);
            }}
          />
          {showModal && (
            <CustomFunctionExprPreviewModal
              data={result}
              title={title}
              env={env}
              onClose={() => setShowModal(false)}
              exprCtx={exprCtx}
            />
          )}
        </>
      );
    } else {
      return null;
    }
  }
);

export function CustomFunctionExprPreviewModal(props: {
  data: Partial<ServerQueryResult>;
  title: React.ReactNode;
  env?: Record<string, any>;
  onClose: () => void;
  exprCtx: ExprCtx;
}) {
  const { data, title, env, onClose, exprCtx } = props;
  const [executeQueue, setExecuteQueue] = React.useState<CustomFunctionExpr[]>(
    []
  );

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
        <ServerQueryOpPreview
          data={data}
          executeQueue={executeQueue}
          setExecuteQueue={setExecuteQueue}
          env={env}
          exprCtx={exprCtx}
        />
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
