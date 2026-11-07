import { useBottomPanelActions } from "@/wab/client/components/BottomPanel";
import type { BindingPreviewContext } from "@/wab/client/components/editor-sessions/binding-session";
import { EditorSession } from "@/wab/client/components/editor-sessions/editor-session";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  QueryDraft,
  ServerQueryOpExprFormAndPreview,
  createServerQuerySession,
} from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker";
import { PopoverFrameProvider } from "@/wab/client/components/sidebar/PopoverFrame";
import { Icon } from "@/wab/client/components/widgets/Icon";
import EditSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__EditSvg";
import { extractDataCtx } from "@/wab/client/state-management/interactions-meta";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { SERVER_QUERY_LOWER } from "@/wab/shared/Labels";
import { ServerQueryOp } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { toVarName } from "@/wab/shared/codegen/util";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { EventHandlerKeyType } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  ComponentServerQuery,
  Interaction,
  TplNode,
  isKnownComponentServerQuery,
} from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import * as React from "react";

/**
 * Removes a query from the environment's $q object to avoid circular references.
 * This is useful when computing the environment for a query's own expression preview.
 */
export function omitQueryFromEnv(
  env: Record<string, any>,
  query: ComponentServerQuery | { name: string },
): Record<string, any> {
  if (env.$q) {
    const { $q, ...restEnv } = env;
    const currentKey = toVarName(query.name);
    const { [currentKey]: _omit, ...filteredQueries } = $q;
    return { ...restEnv, $q: filteredQueries };
  }
  return env;
}

export interface ServerQueryPanelContentProps {
  value: ServerQueryOp | ComponentServerQuery | undefined;
  onSave: (expr: ServerQueryOp, opExprName?: string) => void;
  onCancel: () => void;
  readOnly?: boolean;
  allowedOps?: string[];
  exprCtx: ExprCtx;
  interaction?: Interaction;
  // Must pass viewCtx and tpl instead of a static env so the panel can reactively
  // compute the environment, including newly created data tokens
  viewCtx?: ViewCtx;
  tpl?: TplNode;
  schema?: DataPickerTypesSchema;
  eventHandlerKey?: EventHandlerKeyType;
}

/** For managing a single query panel with a known query key. */
export function useServerQueryPanel(queryKey: string) {
  const serverQueryPanels = useServerQueryPanels();
  return {
    open: (
      props: {
        title?: string;
        selection?: BindingPreviewContext;
      } & ServerQueryPanelContentProps,
    ) => {
      serverQueryPanels.open(queryKey, props);
    },
    close: () => {
      serverQueryPanels.close(queryKey);
    },
  };
}

/** For managing multiple query panels or an unknown/dynamic query. */
export function useServerQueryPanels() {
  const panelActions = useBottomPanelActions();
  const studioCtx = useStudioCtx();
  return {
    open: (
      queryKey: string,
      {
        title,
        selection,
        ...props
      }: {
        title?: string;
        selection?: BindingPreviewContext;
      } & ServerQueryPanelContentProps,
    ) => {
      const query = isKnownComponentServerQuery(props.value)
        ? props.value
        : undefined;
      const component = props.exprCtx.component;
      const session = createServerQuerySession(
        studioCtx,
        props.value,
        props.onSave,
        query && component
          ? {
              exists: () =>
                (!props.viewCtx ||
                  props.viewCtx.site.components.includes(component)) &&
                component.serverQueries.includes(query),
              read: () => ({ op: query.op, name: query.name }),
            }
          : undefined,
      );
      void panelActions.open(queryKey, {
        session,
        title:
          title ||
          (query ? () => query.name : `Configure ${SERVER_QUERY_LOWER}`),
        viewCtx: props.viewCtx,
        selection,
        trailingIcon: <Icon icon={EditSvgIcon} />,
        "data-test-id": "server-query-panel",
        content: {
          kind: "serverQuery",
          props,
          session,
          cloneKey: props.viewCtx?.focusedCloneKey(),
        },
      });
    },
    close: (queryKey: string) => {
      panelActions.discard(queryKey);
    },
  };
}

export const ServerQueryPanelContent = observer(
  function ServerQueryPanelContent({
    value,
    onCancel,
    readOnly,
    schema,
    allowedOps,
    interaction,
    exprCtx,
    viewCtx,
    tpl,
    eventHandlerKey,
    session,
    saveAndClose,
    cloneKey,
  }: ServerQueryPanelContentProps & {
    session: EditorSession<QueryDraft>;
    saveAndClose: () => Promise<boolean>;
    cloneKey?: string;
  }) {
    const parentQuery = isKnownComponentServerQuery(value) ? value : undefined;
    const { env, currGlobalThis } = (() => {
      if (!viewCtx || !tpl || !viewCtx.studioCtx.viewCtxs.includes(viewCtx)) {
        return { env: undefined, currGlobalThis: undefined };
      }

      let computedEnv: Record<string, any> = extractDataCtx(
        viewCtx,
        tpl,
        viewCtx.getCanvasEnvForTpl(tpl, {
          anchorCloneKey: cloneKey,
          ignoreFocusedCloneKey: true,
        }),
        interaction,
        eventHandlerKey,
      );
      // Exclude the current query from $q to avoid circular references
      if (parentQuery) {
        computedEnv = omitQueryFromEnv(computedEnv, parentQuery);
      }
      return {
        env: computedEnv,
        currGlobalThis: viewCtx.canvasCtx.win(),
      };
    })();
    return (
      <PopoverFrameProvider
        containerSelector={
          DEVFLAGS.dockview ? ".bottom-panel" : ".bottom-modals"
        }
      >
        <ServerQueryOpExprFormAndPreview
          session={session}
          saveAndClose={saveAndClose}
          value={value}
          onCancel={onCancel}
          env={env}
          currGlobalThis={currGlobalThis}
          schema={viewCtx?.customFunctionsSchema() ?? schema}
          readOnly={readOnly}
          allowedOps={allowedOps}
          exprCtx={exprCtx}
          interaction={interaction}
        />
      </PopoverFrameProvider>
    );
  },
);

export interface ServerQueryPanelDescriptor {
  kind: "serverQuery";
  props: ServerQueryPanelContentProps;
  session: EditorSession<QueryDraft>;
  cloneKey?: string;
}
