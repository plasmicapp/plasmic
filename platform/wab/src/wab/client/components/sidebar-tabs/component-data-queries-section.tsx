import { PlasmicDataSourceContextProvider } from "@plasmicapp/react-web";
import { Menu } from "antd";
import { autorun } from "mobx";
import { observer } from "mobx-react-lite";
import React from "react";
import {
  Component,
  ComponentDataQuery,
  DataSourceOpExpr,
  isKnownDataSourceOpExpr,
  isKnownTemplatedString,
  TplComponent,
} from "../../../classes";
import { spawn } from "../../../common";
import { isPageComponent } from "../../../components";
import { asCode } from "../../../exprs";
import { getTplComponentFetchers } from "../../../shared/cached-selectors";
import { toVarName } from "../../../shared/codegen/util";
import {
  DATA_QUERY_LOWER,
  DATA_QUERY_PLURAL_CAP,
} from "../../../shared/Labels";
import { renameQueryAndFixExprs } from "../../../shared/refactoring";
import { addEmptyQuery } from "../../../shared/TplMgr";
import { tryGetTplOwnerComponent } from "../../../tpls";
import PlusIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Plus";
import { RightTabKey, useStudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { TutorialEventsType } from "../../tours/tutorials/tutorials-events";
import { WithContextMenu } from "../ContextMenu";
import { SidebarSection } from "../sidebar/SidebarSection";
import { IconLinkButton } from "../widgets";
import { DataQueriesTooltip } from "../widgets/DetailedTooltips";
import { Icon } from "../widgets/Icon";
import { LabeledListItem } from "../widgets/LabeledListItem";
import { LabelWithDetailedTooltip } from "../widgets/LabelWithDetailedTooltip";
import {
  DataSourceOpExprSummary,
  DataSourceOpValuePreview,
  useDataSourceOpExprBottomModal,
} from "./DataSource/DataSourceOpPicker";

const DataQueryRow = observer(
  ({
    query,
    viewCtx,
    component,
  }: {
    component: Component;
    query: ComponentDataQuery;
    viewCtx: ViewCtx;
  }) => {
    const studioCtx = viewCtx.studioCtx;
    const exprCtx = {
      projectFlags: studioCtx.projectFlags(),
      component,
      inStudio: true,
    };

    const handleDataSourceOpChange = async (
      newOp: DataSourceOpExpr,
      opExprName?: string
    ) => {
      await studioCtx.change(({ success }) => {
        query.op = newOp;
        if (opExprName && opExprName !== query.name) {
          renameQueryAndFixExprs(component, query, opExprName);
        }
        return success();
      });
      dataSourceModal.close();
    };

    const dataSourceModal = useDataSourceOpExprBottomModal(query.uuid);
    const openDataSourceModal = () => {
      dataSourceModal.open({
        parent: query,
        value: query.op ?? undefined,
        onSave: handleDataSourceOpChange,
        onCancel: dataSourceModal.close,
        env,
        schema,
        readOpsOnly: true,
        exprCtx,
      });
    };

    const menu = () => {
      return (
        <Menu>
          <Menu.Item onClick={() => openDataSourceModal()}>
            Configure {DATA_QUERY_LOWER}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            onClick={() =>
              studioCtx.siteOps().removeComponentQuery(component, query)
            }
          >
            Remove {DATA_QUERY_LOWER}
          </Menu.Item>
        </Menu>
      );
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

    React.useEffect(() => {
      const dispose = autorun(() => {
        if (studioCtx.newlyAddedQuery === query) {
          studioCtx.newlyAddedQuery = undefined;
          openDataSourceModal();
        }
      });
      return () => dispose();
    }, [query]);

    return (
      <WithContextMenu overlay={menu}>
        <LabeledListItem
          label={query.name}
          menu={menu}
          onClick={() => openDataSourceModal()}
        >
          {query.op ? (
            <div className="flex flex-col fill-width">
              <PlasmicDataSourceContextProvider
                value={{
                  userAuthToken: studioCtx.currentAppUserCtx.fakeAuthToken,
                }}
              >
                <DataSourceOpExprSummary expr={query.op} />
                <DataSourceOpValuePreview
                  expr={query.op}
                  env={env}
                  title={`Query data results for "${query.name}"`}
                  exprCtx={exprCtx}
                />
              </PlasmicDataSourceContextProvider>
            </div>
          ) : (
            <div className="dimfg">Click to configure...</div>
          )}
        </LabeledListItem>
      </WithContextMenu>
    );
  }
);

function ComponentQueriesSection_(props: {
  component: Component;
  viewCtx: ViewCtx;
}) {
  const { component, viewCtx } = props;
  const studioCtx = useStudioCtx();

  const tplFetchers = getTplComponentFetchers(component);

  const componentType = isPageComponent(component) ? "page" : "component";

  let handleAddDataQuery = () => {
    // Intercept add query requests during tour to configure tutorialdb for the user
    if (
      studioCtx.onboardingTourState.triggers.includes(
        TutorialEventsType.AddComponentDataQuery
      )
    ) {
      studioCtx.tourActionEvents.dispatch({
        type: TutorialEventsType.AddComponentDataQuery,
      });
      return;
    }

    spawn(
      studioCtx.change(({ success }) => {
        const query = addEmptyQuery(component);
        studioCtx.newlyAddedQuery = query;
        return success();
      })
    );
  };

  return (
    <SidebarSection
      id="data-queries-section"
      title={
        <LabelWithDetailedTooltip tooltip={DataQueriesTooltip}>
          {DATA_QUERY_PLURAL_CAP}
        </LabelWithDetailedTooltip>
      }
      emptyBody={component.dataQueries.length === 0 && tplFetchers.length === 0}
      zeroBodyPadding
      controls={
        <IconLinkButton
          id="data-queries-add-btn"
          tooltip={`Add ${DATA_QUERY_LOWER} to ${componentType}`}
          onClick={handleAddDataQuery}
        >
          <Icon icon={PlusIcon} />
        </IconLinkButton>
      }
    >
      {component.dataQueries.map((query) => (
        <DataQueryRow
          key={query.uid}
          component={component}
          query={query}
          viewCtx={viewCtx}
        />
      ))}
      {tplFetchers.map((tpl) => {
        return <TplFetcherRow tpl={tpl} viewCtx={viewCtx} />;
      })}
    </SidebarSection>
  );
}

const TplFetcherRow = observer(function TplFetcherRow(props: {
  tpl: TplComponent;
  viewCtx: ViewCtx;
}) {
  const { tpl, viewCtx } = props;
  const component = tryGetTplOwnerComponent(tpl) ?? null;
  const exprCtx = {
    projectFlags: viewCtx.projectFlags(),
    component,
    inStudio: true,
  };

  const effectiveVs = viewCtx.variantTplMgr().effectiveVariantSetting(tpl);

  const nameExpr = effectiveVs.args.find(
    (arg) => arg.param.variable.name === "name"
  )?.expr;

  const name = !nameExpr
    ? "Unnamed query"
    : isKnownTemplatedString(nameExpr)
    ? asCode(nameExpr, exprCtx).code.slice(1, -1)
    : JSON.parse(asCode(nameExpr, exprCtx).code);

  const dataOpExpr = effectiveVs.args.find(
    (arg) => arg.param.variable.name === "dataOp"
  )?.expr;

  const env = viewCtx.getCanvasEnvForTpl(tpl);

  return (
    <LabeledListItem
      label={name}
      subtitle={"Fetcher"}
      withSubtitle
      onClick={() => {
        viewCtx.setStudioFocusByTpl(tpl);
        viewCtx.studioCtx.switchRightTab(RightTabKey.settings);
      }}
    >
      {isKnownDataSourceOpExpr(dataOpExpr) ? (
        env ? (
          <div className="flex flex-col fill-width">
            <DataSourceOpExprSummary expr={dataOpExpr} />
            <DataSourceOpValuePreview
              expr={dataOpExpr}
              env={env}
              title={`Query data results for fetcher "${name}"`}
              exprCtx={exprCtx}
            />
          </div>
        ) : (
          <div className="dimfg">Not visible</div>
        )
      ) : (
        <div className="dimfg">Click to configure...</div>
      )}
    </LabeledListItem>
  );
});

export const ComponentDataQueriesSection = observer(ComponentQueriesSection_);
