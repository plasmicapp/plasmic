import styles from "@/wab/client/components/sidebar-tabs/ServerQuery/QueryResultPreview.module.scss";
import { ServerQueryOpPreview } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker";
import { useServerQueryOp } from "@/wab/client/components/sidebar-tabs/ServerQuery/useServerQueryOp";
import { ValuePreview } from "@/wab/client/components/sidebar-tabs/data-tab";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "@/wab/client/utils/mobx-client-util";
import { SERVER_QUERY_LOWER } from "@/wab/shared/Labels";
import { ServerQueryOp } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { ensure } from "@/wab/shared/common";
import { StatefulQueryState } from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import {
  customFunctionId,
  makeCustomCodeQueryKey,
} from "@/wab/shared/core/query-ids";
import {
  CustomCode,
  CustomFunctionExpr,
  isKnownCustomFunctionExpr,
} from "@/wab/shared/model/classes";
import { smartHumanize } from "@/wab/shared/strs";
import * as React from "react";

export const CustomFunctionExprPreview = observer(
  function CustomFunctionExprPreview(props: {
    expr: CustomFunctionExpr;
    title?: React.ReactNode;
    env?: Record<string, any>;
    exprCtx: ExprCtx;
  }) {
    if (!props.env) {
      return null;
    }
    return <CustomFunctionExprPreviewInner {...props} env={props.env} />;
  }
);

const CustomFunctionExprPreviewInner = observer(
  function CustomFunctionExprPreviewInner(props: {
    expr: CustomFunctionExpr;
    title?: React.ReactNode;
    env: Record<string, any>;
    exprCtx: ExprCtx;
  }) {
    const { expr, env, title, exprCtx } = props;
    const studioCtx = useStudioCtx();
    const functionId = customFunctionId(expr.func);
    const regFunc = ensure(
      studioCtx.getRegisteredFunctionsMap().get(functionId),
      `Missing registered function for ${SERVER_QUERY_LOWER}`
    );
    const result = useServerQueryOp({
      fnId: functionId,
      fn: regFunc.function,
      expr,
      env,
      exprCtx,
    });
    return <QueryResultPreview queryState={result.queryState} title={title} />;
  }
);

function QueryResultPreview(props: {
  queryState: StatefulQueryState;
  title?: React.ReactNode;
}) {
  const { queryState, title } = props;
  const [showModal, setShowModal] = React.useState(false);
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

export const CustomCodePreview = observer(function CustomCodePreview(props: {
  queryUuid: string;
  expr: CustomCode;
  title?: React.ReactNode;
  env?: Record<string, any>;
}) {
  if (!props.env) {
    return null;
  }
  return <CustomCodePreviewInner {...props} env={props.env} />;
});

const CustomCodePreviewInner = observer(function CustomCodePreviewInner(props: {
  queryUuid: string;
  expr: CustomCode;
  title?: React.ReactNode;
  env: Record<string, any>;
}) {
  const { queryUuid, expr, env, title } = props;
  const result = useServerQueryOp({
    fnId: makeCustomCodeQueryKey(queryUuid),
    code: expr,
    env,
  });
  return <QueryResultPreview queryState={result.queryState} title={title} />;
});

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

export const ServerQueryOpSummary = observer(
  function ServerQueryOpSummary(props: { expr: ServerQueryOp }) {
    const { expr } = props;
    return (
      <div className={styles.serverQueryOpSummary}>
        {isKnownCustomFunctionExpr(expr)
          ? smartHumanize(customFunctionId(expr.func))
          : "Custom code"}
      </div>
    );
  }
);
