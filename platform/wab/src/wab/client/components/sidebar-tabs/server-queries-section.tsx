import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import {
  CustomCodePreview,
  CustomFunctionExprPreview,
  ServerQueryOpSummary,
} from "@/wab/client/components/sidebar-tabs/ServerQuery/QueryResultPreview";
import { omitQueryFromEnv } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryPanel";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  IFrameAwareDropdownMenu,
  IconLinkButton,
} from "@/wab/client/components/widgets";
import { ServerQueriesTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import { useOpenNewlyAddedQuery } from "@/wab/client/hooks/useOpenNewlyAddedQuery";
import { useOpenQueryPanel } from "@/wab/client/hooks/useOpenQueryPanel";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { mkComponentScopedUiId } from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  CONFIGURE_ACTION,
  DELETE_ACTION,
  DUPLICATE_ACTION,
  SERVER_QUERY_LOWER,
  SERVER_QUERY_PLURAL_CAP,
} from "@/wab/shared/Labels";
import { isServerQueryWithOperation } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { spawn } from "@/wab/shared/common";
import {
  getComponentDisplayName,
  isPageComponent,
} from "@/wab/shared/core/components";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Component,
  ComponentServerQuery,
  isKnownCustomCode,
  isKnownCustomFunctionExpr,
} from "@/wab/shared/model/classes";
import { Menu, notification } from "antd";
import { observer } from "mobx-react";
import { ok } from "neverthrow";
import React from "react";

const ServerQueryRow = observer(
  (props: {
    component: Component;
    query: ComponentServerQuery;
    viewCtx: ViewCtx;
  }) => {
    const { component, query, viewCtx } = props;
    const studioCtx = viewCtx.studioCtx;
    const projectFlags = studioCtx.projectFlags();
    // Identity-stable for useServerQueryOp's memo deps.
    const exprCtx: ExprCtx = React.useMemo(
      () => ({
        projectFlags,
        component,
        inStudio: true,
      }),
      [projectFlags, component],
    );
    const tpl = viewCtx.currentCtxTplRoot();

    const openQuery = useOpenQueryPanel();
    const openServerQueryPanel = () => openQuery(viewCtx, query);

    const menu = () => {
      return (
        <Menu>
          <Menu.Item onClick={openServerQueryPanel}>
            {CONFIGURE_ACTION}
          </Menu.Item>
          <Menu.Item
            onClick={() =>
              spawn(
                studioCtx.change(() => {
                  studioCtx
                    .tplMgr()
                    .duplicateComponentServerQuery(component, query);
                  return ok();
                }),
              )
            }
          >
            {DUPLICATE_ACTION}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            onClick={() =>
              studioCtx.siteOps().removeComponentServerQuery(component, query)
            }
          >
            {DELETE_ACTION}
          </Menu.Item>
        </Menu>
      );
    };
    const title = `Query data results for "${query.name}"`;
    let env: Record<string, any> | undefined = viewCtx.getCanvasEnvForTpl(tpl, {
      forDataRepCollection: true,
    });
    if (env) {
      env = omitQueryFromEnv(env, query);
    }
    const currGlobalThis = viewCtx.canvasCtx.win();

    useOpenNewlyAddedQuery(studioCtx, query, openServerQueryPanel);

    return (
      <WithContextMenu overlay={menu}>
        <LabeledListItem
          uiId={mkComponentScopedUiId(query, component.uuid)}
          label={query.name}
          menu={menu}
          onClick={openServerQueryPanel}
        >
          {query.op ? (
            <div className="flex flex-col fill-width">
              <ServerQueryOpSummary expr={query.op} />
              {isKnownCustomFunctionExpr(query.op) ? (
                <CustomFunctionExprPreview
                  expr={query.op}
                  env={env}
                  title={title}
                  exprCtx={exprCtx}
                  currGlobalThis={currGlobalThis}
                />
              ) : isKnownCustomCode(query.op) ? (
                <CustomCodePreview
                  queryUuid={query.uuid}
                  expr={query.op}
                  env={env}
                  title={title}
                />
              ) : null}
            </div>
          ) : (
            <div className="dimfg">Click to configure...</div>
          )}
        </LabeledListItem>
      </WithContextMenu>
    );
  },
);

function ServerQueriesSection_(props: {
  component: Component;
  viewCtx: ViewCtx;
}) {
  const { component, viewCtx } = props;
  const studioCtx = useStudioCtx();

  const componentType = isPageComponent(component) ? "page" : "component";

  const handleAddBlankQuery = () => {
    spawn(
      studioCtx.change(() => {
        const query = studioCtx.tplMgr().addComponentServerQuery(component);
        if (DEVFLAGS.dockview) {
          studioCtx.newlyAddedQuery = query;
        }
        return ok();
      }),
    );
  };

  const handleCopyFromQuery = (
    sourceComponent: Component,
    sourceQuery: ComponentServerQuery,
  ) => {
    spawn(
      studioCtx.change(() => {
        const { copied, componentVarRefs } = studioCtx
          .tplMgr()
          .copyServerQueryWithDependencies(
            component,
            sourceComponent,
            sourceQuery,
          );
        const names = copied.map((q) => q.name);
        const varLabels: Record<string, string> = {
          $state: "state",
          $props: "props",
          $ctx: "context",
        };
        const warnings = Object.keys(componentVarRefs).map(
          (varType) =>
            `${varLabels[varType] ?? varType} (${Array.from(
              componentVarRefs[varType],
            ).join(", ")})`,
        );
        notification.success({
          message: `Copied ${
            names.length === 1 ? "query" : "queries"
          }: ${names.join(", ")}`,
          description:
            warnings.length > 0
              ? `References component ${warnings.join(
                  ", ",
                )} that may not exist or differ in this component.`
              : undefined,
        });
        return ok();
      }),
    );
  };

  const otherComponentsWithQueries = studioCtx.site.components.filter(
    (c) => c !== component && c.serverQueries.some(isServerQueryWithOperation),
  );

  const addMenu = (onMenuClicked: () => void) => (
    <Menu>
      <Menu.Item
        key="new"
        onClick={() => {
          handleAddBlankQuery();
          onMenuClicked();
        }}
      >
        New
      </Menu.Item>
      {otherComponentsWithQueries.length > 0 && (
        <>
          <Menu.Divider />
          <Menu.SubMenu key="copy-from" title="Copy from...">
            {otherComponentsWithQueries.map((c) => (
              <Menu.SubMenu key={c.uuid} title={getComponentDisplayName(c)}>
                {c.serverQueries.filter(isServerQueryWithOperation).map((q) => (
                  <Menu.Item
                    key={q.uuid}
                    // the minwidth ensures the innermost submenu popup is wide enough
                    // so it doesn't flip and overlap its parent menu
                    style={{ minWidth: 130 }}
                    onClick={() => {
                      handleCopyFromQuery(c, q);
                      onMenuClicked();
                    }}
                  >
                    {q.name}
                  </Menu.Item>
                ))}
              </Menu.SubMenu>
            ))}
          </Menu.SubMenu>
        </>
      )}
    </Menu>
  );

  return (
    <SidebarSection
      id="server-queries-section"
      title={
        <LabelWithDetailedTooltip tooltip={ServerQueriesTooltip}>
          {SERVER_QUERY_PLURAL_CAP}
        </LabelWithDetailedTooltip>
      }
      emptyBody={component.serverQueries.length === 0}
      emptyDescription="Fetch data from external sources."
      zeroBodyPadding
      controls={
        otherComponentsWithQueries.length > 0 ? (
          <IFrameAwareDropdownMenu menu={addMenu}>
            <IconLinkButton
              id="server-queries-add-btn"
              tooltip={`Add ${SERVER_QUERY_LOWER} to ${componentType}`}
            >
              <Icon icon={PlusIcon} />
            </IconLinkButton>
          </IFrameAwareDropdownMenu>
        ) : (
          <IconLinkButton
            id="server-queries-add-btn"
            tooltip={`Add ${SERVER_QUERY_LOWER} to ${componentType}`}
            onClick={handleAddBlankQuery}
          >
            <Icon icon={PlusIcon} />
          </IconLinkButton>
        )
      }
    >
      {component.serverQueries.map((query) => (
        <ServerQueryRow
          key={query.name}
          component={component}
          viewCtx={viewCtx}
          query={query}
        />
      ))}
    </SidebarSection>
  );
}

export const ServerQueriesSection = observer(ServerQueriesSection_);
