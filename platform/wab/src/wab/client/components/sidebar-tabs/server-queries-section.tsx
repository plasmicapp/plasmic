import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import {
  CustomFunctionExprPreview,
  CustomFunctionExprSummary,
} from "@/wab/client/components/sidebar-tabs/ServerQuery/CustomFunctionExprPreview";
import {
  omitQueryFromEnv,
  useServerQueryBottomModal,
} from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryBottomModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { ServerQueriesTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  SERVER_QUERY_LOWER,
  SERVER_QUERY_PLURAL_CAP,
} from "@/wab/shared/Labels";
import { toVarName } from "@/wab/shared/codegen/util";
import { mkShortId, spawn, uniqueName } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import { ExprCtx } from "@/wab/shared/core/exprs";
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
    const exprCtx: ExprCtx = {
      projectFlags: studioCtx.projectFlags(),
      component,
      inStudio: true,
    };
    const schema = viewCtx.customFunctionsSchema();
    const tpl = viewCtx.currentCtxTplRoot();

    const serverQueryModal = useServerQueryBottomModal(query.uuid);
    const openServerQueryModal = () => {
      // Pass viewCtx and tpl instead of a static env so the modal can reactively
      // compute the environment, including newly created data tokens
      serverQueryModal.open({
        value: query.op ?? undefined,
        onSave: handleCustomFunctionExprChange,
        onCancel: serverQueryModal.close,
        viewCtx,
        tpl,
        schema,
        exprCtx,
        parent: query,
      });
    };

    const handleCustomFunctionExprChange = async (
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
            Configure {SERVER_QUERY_LOWER}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            onClick={() =>
              studioCtx.siteOps().removeComponentServerQuery(component, query)
            }
          >
            Remove {SERVER_QUERY_LOWER}
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
              <CustomFunctionExprSummary expr={query.op} />
              <CustomFunctionExprPreview
                expr={query.op}
                env={omitQueryFromEnv(
                  viewCtx.getCanvasEnvForTpl(tpl, {
                    forDataRepCollection: true,
                  }),
                  query
                )}
                title={`Query data results for "${query.name}"`}
                exprCtx={exprCtx}
              />
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
              [
                ...component.serverQueries.map((q) => q.name),
                ...component.dataQueries.map((q) => q.name),
              ],
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
        <LabelWithDetailedTooltip tooltip={ServerQueriesTooltip}>
          {SERVER_QUERY_PLURAL_CAP}
        </LabelWithDetailedTooltip>
      }
      emptyBody={component.serverQueries.length === 0}
      zeroBodyPadding
      controls={
        <IconLinkButton
          id="server-queries-add-btn"
          tooltip={`Add ${SERVER_QUERY_LOWER} to ${componentType}`}
          onClick={handleAddDataQuery}
        >
          <Icon icon={PlusIcon} />
        </IconLinkButton>
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
