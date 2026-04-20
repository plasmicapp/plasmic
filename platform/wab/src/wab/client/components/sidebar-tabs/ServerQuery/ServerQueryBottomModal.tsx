import { useBottomModalActions } from "@/wab/client/components/BottomModal";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { ServerQueryOpExprFormAndPreview } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker";
import { PopoverFrameProvider } from "@/wab/client/components/sidebar/PopoverFrame";
import { extractDataCtx } from "@/wab/client/state-management/interactions-meta";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { SERVER_QUERY_LOWER } from "@/wab/shared/Labels";
import { ServerQueryOp } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { toVarName } from "@/wab/shared/codegen/util";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { EventHandlerKeyType } from "@/wab/shared/core/tpls";
import {
  ComponentServerQuery,
  Interaction,
  TplNode,
  isKnownComponentServerQuery,
} from "@/wab/shared/model/classes";
import { PlasmicQueryDataProvider } from "@plasmicapp/query";
import { observer } from "mobx-react";
import * as React from "react";

/**
 * Removes a query from the environment's $q object to avoid circular references.
 * This is useful when computing the environment for a query's own expression preview.
 */
export function omitQueryFromEnv(
  env: Record<string, any> | undefined,
  query: ComponentServerQuery | { name: string }
): Record<string, any> | undefined {
  if (env?.$q) {
    const { $q, ...restEnv } = env;
    const currentKey = toVarName(query.name);
    const { [currentKey]: _omit, ...filteredQueries } = $q;
    return { ...restEnv, $q: filteredQueries };
  }
  return env;
}

interface ServerQueryOpExprBottomModalContentProps {
  value: ServerQueryOp | ComponentServerQuery | undefined;
  onSave: (expr: ServerQueryOp, opExprName?: string) => unknown;
  onCancel: () => unknown;
  readOnly?: boolean;
  allowedOps?: string[];
  exprCtx: ExprCtx;
  interaction?: Interaction;
  // Must pass viewCtx and tpl instead of a static env so the modal can reactively
  // compute the environment, including newly created data tokens
  viewCtx?: ViewCtx;
  tpl?: TplNode;
  schema?: DataPickerTypesSchema;
  eventHandlerKey?: EventHandlerKeyType;
  filterMode: "query" | "mutation";
}

/** For managing a single query modal with a known query key. */
export function useServerQueryBottomModal(queryKey: string) {
  const serverQueryModals = useServerQueryBottomModals();
  return {
    open: (
      props: {
        title?: string;
        "data-test-id"?: string;
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
        title: title || `Configure ${SERVER_QUERY_LOWER}`,
        "data-test-id": "server-query-bottom-modal",
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
    allowedOps,
    interaction,
    exprCtx,
    viewCtx,
    tpl,
    eventHandlerKey,
    filterMode,
  }: ServerQueryOpExprBottomModalContentProps) {
    const parentQuery = isKnownComponentServerQuery(value) ? value : undefined;
    const wrappedOnSave = React.useCallback(
      (newExpr: ServerQueryOp, opExprName?: string) => {
        onSave(newExpr, opExprName);
      },
      [onSave]
    );

    // Server query modal gets its own isolated cache so it doesn't interfere
    // with the cache in the current canvas.
    const swrCache = React.useMemo(() => new Map<string, unknown>(), []);

    const env = (() => {
      const computedEnv =
        viewCtx && tpl
          ? extractDataCtx(
              viewCtx,
              tpl,
              undefined,
              interaction,
              eventHandlerKey
            )
          : undefined;
      // Exclude the current query from $q to avoid circular references
      if (parentQuery) {
        return omitQueryFromEnv(computedEnv, parentQuery);
      }
      return computedEnv;
    })();

    return (
      <PopoverFrameProvider containerSelector=".bottom-modals">
        <PlasmicQueryDataProvider provider={() => swrCache}>
          <ServerQueryOpExprFormAndPreview
            value={value}
            onSave={wrappedOnSave}
            onCancel={onCancel}
            env={env}
            schema={schema}
            readOnly={readOnly}
            allowedOps={allowedOps}
            exprCtx={exprCtx}
            interaction={interaction}
            filterMode={filterMode}
          />
        </PlasmicQueryDataProvider>
      </PopoverFrameProvider>
    );
  }
);
