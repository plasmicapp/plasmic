import styles from "@/wab/client/components/sidebar-tabs/ServerQuery/QueryResultPreview.module.scss";
import { ServerQueryOpPreview } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker";
import { useServerQueryOp } from "@/wab/client/components/sidebar-tabs/ServerQuery/useServerQueryOp";
import { ValuePreview } from "@/wab/client/components/sidebar-tabs/data-tab";
import {
  InvalidArgsBadge,
  InvalidArgsSummary,
} from "@/wab/client/components/widgets/InvalidArgs";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { observer } from "@/wab/client/utils/mobx-client-util";
import { ServerQueryOp } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { StatefulQueryState } from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { InvalidArg } from "@/wab/shared/core/invalid-arg";
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
import { Tooltip } from "antd";
import * as React from "react";

export const CustomFunctionExprPreview = observer(
  function CustomFunctionExprPreview(props: {
    expr: CustomFunctionExpr;
    title?: React.ReactNode;
    env?: Record<string, any>;
    exprCtx: ExprCtx;
    currGlobalThis?: typeof globalThis;
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
    currGlobalThis?: typeof globalThis;
  }) {
    const { expr, env, title, exprCtx, currGlobalThis } = props;
    const { queryState, invalidArgs } = useServerQueryOp({
      expr,
      env,
      exprCtx,
      currGlobalThis,
    });
    // The query is blocked from running while required params are unset; show
    // a "Fix validation errors" indicator rather than the blocked query's
    // error, and don't offer to inspect a non-result.
    if (invalidArgs) {
      return <InlineValidationErrorPreview invalidArgs={invalidArgs} />;
    }
    if (!queryState) {
      return null;
    }
    return <QueryResultPreview queryState={queryState} title={title} />;
  }
);

/**
 * Compact inline indicator shown in place of a result preview when a server
 * query is blocked from running because some params are invalid. Styled
 * amber like the per-field validation warning; the tooltip lists the invalid
 * fields.
 */
function InlineValidationErrorPreview(props: {
  invalidArgs: Record<string, InvalidArg>;
}) {
  const invalidArgs = Object.values(props.invalidArgs);
  return (
    <Tooltip title={<InvalidArgsSummary invalidArgs={invalidArgs} />}>
      <InvalidArgsBadge className="value-preview">
        Fix validation errors
      </InvalidArgsBadge>
    </Tooltip>
  );
}

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
  const { queryState } = useServerQueryOp({
    fnId: makeCustomCodeQueryKey(queryUuid),
    code: expr,
    env,
  });
  if (!queryState) {
    return null;
  }
  return <QueryResultPreview queryState={queryState} title={title} />;
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
        <ServerQueryOpPreview queryState={queryState} invalidArgs={undefined} />
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
