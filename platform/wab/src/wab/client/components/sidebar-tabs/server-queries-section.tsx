import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import { useServerQueryBottomModal } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryBottomModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { DataQueriesTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { toVarName } from "@/wab/shared/codegen/util";
import { mkShortId, spawn, uniqueName } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import {
  Component,
  ComponentServerQuery,
  CustomFunctionExpr,
} from "@/wab/shared/model/classes";
import { renameServerQueryAndFixExprs } from "@/wab/shared/refactoring";
import { Menu } from "antd";
import { observer } from "mobx-react";
import React from "react";

const ServerQueryRow = observer(
  (props: {
    component: Component;
    query: ComponentServerQuery;
    viewCtx: ViewCtx;
  }) => {
    const { component, query, viewCtx } = props;
    const studioCtx = viewCtx.studioCtx;
    const exprCtx = {
      projectFlags: studioCtx.projectFlags(),
      component,
      inStudio: true,
    };
    // For some reason calling `omit` tries to read from the query data,
    // throwing `PlasmicUndefinedDataError`
    const env = {
      ...viewCtx.getCanvasEnvForTpl(viewCtx.currentCtxTplRoot(), {
        forDataRepCollection: true,
      }),
    };
    if (env.$queries) {
      env.$queries = { ...env.$queries };
      delete env.$queries[toVarName(query.name)];
    }
    const schema = viewCtx.customFunctionsSchema();

    const serverQueryModal = useServerQueryBottomModal(query.uuid);
    const openServerQueryModal = () => {
      serverQueryModal.open({
        value: query.op ?? undefined,
        onSave: handleDataSourceOpChange,
        onCancel: serverQueryModal.close,
        env,
        schema,
        exprCtx,
        parent: query,
      });
    };

    const handleDataSourceOpChange = async (
      newOp: CustomFunctionExpr,
      opExprName?: string
    ) => {
      await studioCtx.change(({ success }) => {
        query.op = newOp;
        if (opExprName && opExprName !== query.name) {
          renameServerQueryAndFixExprs(component, query, opExprName);
        }
        return success();
      });
      serverQueryModal.close();
    };

    const menu = () => {
      return (
        <Menu>
          <Menu.Item onClick={() => openServerQueryModal()}>
            Configure server query
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            onClick={() =>
              studioCtx.siteOps().removeComponentServerQuery(component, query)
            }
          >
            Remove server query
          </Menu.Item>
        </Menu>
      );
    };

    return (
      <WithContextMenu overlay={menu}>
        <LabeledListItem
          label={query.name}
          menu={menu}
          onClick={() => openServerQueryModal()}
        >
          {query.op ? (
            <div className="flex flex-col fill-width">
              {query.name}
              {/* <DataSourceOpExprSummary expr={query.op} /> */}
              {/* <DataSourceOpValuePreview
                expr={query.op}
                env={env}
                title={`Query data results for "${query.name}"`}
                exprCtx={exprCtx}
              /> */}
            </div>
          ) : (
            <div className="dimfg">Click to configure...</div>
          )}
        </LabeledListItem>
      </WithContextMenu>
    );
  }
);

function ServerQueriesSection_(props: {
  component: Component;
  viewCtx: ViewCtx;
}) {
  const { component, viewCtx } = props;
  const studioCtx = useStudioCtx();

  const componentType = isPageComponent(component) ? "page" : "component";

  const handleAddDataQuery = () => {
    spawn(
      studioCtx.change(({ success }) => {
        const serverQuery = new ComponentServerQuery({
          uuid: mkShortId(),
          name: toVarName(
            uniqueName(
              component.serverQueries.map((q) => q.name),
              "query",
              {
                normalize: toVarName,
              }
            )
          ),
          op: undefined,
        });

        component.serverQueries.push(serverQuery);
        return success();
      })
    );
  };

  return (
    <SidebarSection
      id="server-queries-section"
      title={
        <LabelWithDetailedTooltip tooltip={DataQueriesTooltip}>
          Server queries
        </LabelWithDetailedTooltip>
      }
      emptyBody={component.serverQueries.length === 0}
      zeroBodyPadding
      controls={
        <IconLinkButton
          id="server-queries-add-btn"
          tooltip={`Add server query to ${componentType}`}
          onClick={handleAddDataQuery}
        >
          <Icon icon={PlusIcon} />
        </IconLinkButton>
      }
    >
      {component.serverQueries.map((query) => (
        <ServerQueryRow component={component} viewCtx={viewCtx} query={query} />
      ))}
    </SidebarSection>
  );
}

export const ServerQueriesSection = observer(ServerQueriesSection_);
