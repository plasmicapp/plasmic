import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import {
  createAddHostLessComponent,
  HostLessComponentExtraInfo,
} from "@/wab/client/components/studio/add-drawer/AddDrawer";
import {
  AddTplItem,
  INSERTABLES_MAP,
} from "@/wab/client/definitions/insertables";
import { addGetManyQuery, StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { StudioTutorialStep } from "@/wab/client/tours/tutorials/tutorials-types";
import { ensure, ensureArray, waitUntil } from "@/wab/shared/common";
import { ComponentType, isPageComponent } from "@/wab/shared/core/components";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  code,
  deserCompositeExprMaybe,
  serCompositeExprMaybe,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { AddItemKey } from "@/wab/shared/add-item-keys";
import {
  ALL_QUERIES,
  dataSourceTemplateToString,
  mkDataSourceTemplate,
} from "@/wab/shared/data-sources-meta/data-sources";
import { DATA_SOURCE_LOWER } from "@/wab/shared/Labels";
import {
  DataSourceOpExpr,
  DataSourceTemplate,
  EventHandler,
  isKnownCompositeExpr,
  isKnownCustomCode,
  isKnownObjectPath,
  isKnownTplComponent,
  isKnownTplSlot,
  ObjectPath,
  QueryInvalidationExpr,
  TemplatedString,
  TplComponent,
  TplNode,
} from "@/wab/shared/model/classes";
import { getTplComponentArg } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { mkInteraction } from "@/wab/shared/core/states";
import {
  filterTpls,
  flattenTpls,
  isTplComponent,
  tryGetTplOwnerComponent,
} from "@/wab/shared/core/tpls";
import { capitalize, isEqual, mapValues } from "lodash";

export const ONBOARDING_TUTORIALS_META = {
  northwind: {
    customersTableName: "customers-table",
    ordersTableName: "orders-table",
    customersQueryName: "customers",
    ordersQueryName: "orders",
  },
};

export const TUTORIAL_DB_META = {
  northwind: {
    name: "northwind",
    tables: {
      customers: `public"."customers`,
      orders: `public"."orders`,
    },
    schemas: {
      customers: [
        {
          id: "customer_id",
          type: "string",
          readOnly: false,
        },
        {
          id: "company_name",
          type: "string",
          readOnly: false,
        },
        {
          id: "contact_name",
          type: "string",
          readOnly: false,
        },
        {
          id: "contact_title",
          type: "string",
          readOnly: false,
        },
        {
          id: "address",
          type: "string",
          readOnly: false,
        },
        {
          id: "city",
          type: "string",
          readOnly: false,
        },
        {
          id: "region",
          type: "string",
          readOnly: false,
        },
        {
          id: "postal_code",
          type: "string",
          readOnly: false,
        },
        {
          id: "country",
          type: "string",
          readOnly: false,
        },
        {
          id: "phone",
          type: "string",
          readOnly: false,
        },
        {
          id: "fax",
          type: "string",
          readOnly: false,
        },
      ],
    },
  },
};

async function getTutorialDBMeta(
  studioCtx: StudioCtx,
  dsName = TUTORIAL_DB_META.northwind.name
) {
  const workspaceTutorialDbs = studioCtx.siteInfo.workspaceTutorialDbs ?? [];

  const tutorialDBMeta = ensure(
    workspaceTutorialDbs.find(
      (ds) => ds.source === "tutorialdb" && ds.settings.type === dsName
    ),
    "Tutorial DB data source not found in the workspace"
  );

  return tutorialDBMeta;
}

export async function addTutorialdbQuery(
  studioCtx: StudioCtx,
  dsName: string,
  table: string,
  queryName: string,
  opts?: {
    withFilters?: boolean;
  }
) {
  const tutorialDBMeta = await getTutorialDBMeta(studioCtx, dsName);

  const component = studioCtx.focusedOrFirstViewCtx()?.component;
  if (!component) {
    return;
  }

  if (!tutorialDBMeta) {
    return;
  }

  const templates = {
    sort: mkDataSourceTemplate({
      fieldType: "sort[]",
      value: new TemplatedString({
        text: [
          JSON.stringify([
            {
              field: "customer_id",
              order: "asc",
            },
          ]),
        ],
      }),
      bindings: null,
    }),
    ...(opts?.withFilters
      ? {
          filters: new DataSourceTemplate({
            fieldType: "filter[]",
            value: JSON.stringify(filtersTemplates.ordersByShipCountry.value),
            bindings: {
              ...mapValues(
                filtersTemplates.ordersByShipCountry.bindings,
                (obj) => {
                  return new TemplatedString({
                    text: [
                      "",
                      new ObjectPath({
                        path: obj.path,
                        fallback: null,
                      }),
                      "",
                    ],
                  });
                }
              ),
            },
          }),
        }
      : {}),
  };
  const query = await addGetManyQuery({
    dataSourceId: tutorialDBMeta.id,
    table,
    templates,
    studioCtx,
    component,
    queryName,
  });

  if (query) {
    await studioCtx.change(({ success }) => {
      studioCtx.newlyAddedQuery = query;

      studioCtx.mergeOnboardingTourStateResults({
        addedQuery: query.uuid,
      });

      return success();
    });
  }
}

function getTplByUUID(studioCtx: StudioCtx, uuid: string) {
  const vc = studioCtx.focusedOrFirstViewCtx();

  if (vc) {
    const matchedTpls = filterTpls(
      vc.component.tplTree,
      (tpl) => tpl.uuid === uuid
    );

    if (matchedTpls.length === 1) {
      return matchedTpls[0];
    }
  }

  return undefined;
}

async function getHostLessSpec(
  studioCtx: StudioCtx,
  pkgCodeName: string,
  componentName: string
): Promise<{
  addItem?: AddTplItem<HostLessComponentExtraInfo | false>;
  extraInfo?: HostLessComponentExtraInfo | false;
}> {
  const hostLessComponentsMeta =
    studioCtx.appCtx.appConfig.hostLessComponents ??
    DEVFLAGS.hostLessComponents;
  // Find any hostless package that has the desired component
  // so that we don't depend on the exact package name
  const hostLessPkg = hostLessComponentsMeta?.find((meta) =>
    meta.items.some((item) => item.componentName === componentName)
  );

  if (!hostLessPkg) {
    return {
      addItem: undefined,
      extraInfo: undefined,
    };
  }

  const hostLessPkgItem = hostLessPkg.items.find(
    (item) => item.componentName === componentName
  );

  if (!hostLessPkgItem) {
    return {
      addItem: undefined,
      extraInfo: undefined,
    };
  }

  const addItem = createAddHostLessComponent(
    {
      type: "hostless-component",
      componentName,
      displayName: hostLessPkgItem.displayName ?? componentName,
    },
    ensureArray(hostLessPkg.projectId)
  );

  // should ensure something is focused
  const vc = studioCtx.focusedOrFirstViewCtx();

  if (!vc) {
    return {
      addItem: undefined,
      extraInfo: undefined,
    };
  }

  const extraInfo = addItem.asyncExtraInfo
    ? await addItem.asyncExtraInfo(studioCtx)
    : undefined;

  return {
    addItem,
    extraInfo,
  };
}

export function getFirstChildIfRichLayout(root: TplNode) {
  const pageLayout = $$$(root).children().maybeOneTpl();
  if (
    isKnownTplComponent(pageLayout) &&
    // The name is based on the blank template app that has a component named "Page Layout"
    pageLayout.component.name === "Page Layout"
  ) {
    return pageLayout;
  }
  return undefined;
}

/** @return added tpl's UUID */
export async function addHostLessComponent(
  studioCtx: StudioCtx,
  pkgCodeName: string,
  componentName: string,
  settings: {
    insertOnFocused: boolean;
    changeTpl?: (tpl: TplNode) => void;
  } = {
    insertOnFocused: false,
  }
): Promise<string> {
  const { addItem, extraInfo } = await getHostLessSpec(
    studioCtx,
    pkgCodeName,
    componentName
  );

  const vc = studioCtx.focusedOrFirstViewCtx();

  if (!vc || !addItem || !extraInfo) {
    throw new Error(`failed to add ${componentName}, preconditions failed`);
  }

  const arenaRoot = vc.arenaFrame().container.component.tplTree;
  const pageLayout = getFirstChildIfRichLayout(arenaRoot);

  const target = pageLayout ?? arenaRoot;
  let tplUuid: string | undefined;
  await studioCtx.change(({ success }) => {
    tplUuid = vc.viewOps.tryInsertInsertableSpec(
      addItem,
      InsertRelLoc.append,
      extraInfo,
      !settings.insertOnFocused ? target : undefined
    )?.uuid;
    return success();
  });

  studioCtx.setShowAddDrawer(false);

  if (!tplUuid) {
    throw new Error(`failed to add ${componentName}`);
  }
  return tplUuid;
}

export function addRichTable(studioCtx: StudioCtx) {
  return addHostLessComponent(
    studioCtx,
    "plasmic-rich-components",
    "hostless-rich-table"
  );
}

export function addForm(studioCtx: StudioCtx) {
  return addHostLessComponent(studioCtx, "antd5-form", "plasmic-antd5-form");
}

export async function addTextElement(studioCtx: StudioCtx) {
  const vc = studioCtx.focusedOrFirstViewCtx();
  if (!vc) {
    throw new Error("Missing view context");
  }
  const tplTree = vc.arenaFrame().container.component.tplTree;
  const target = flattenTpls(tplTree).find(
    (tpl) => !isKnownTplSlot(tpl) && tpl.name === "mainTextContainer"
  );
  await studioCtx.change(({ success }) => {
    vc.viewOps.tryInsertInsertableSpec(
      INSERTABLES_MAP[AddItemKey.text] as AddTplItem,
      InsertRelLoc.append,
      undefined,
      target
    );
    return success();
  });

  studioCtx.setShowAddDrawer(false);
}

export async function isTableLinkedToRightQuery(
  studioCtx: StudioCtx,
  tableUuid: string | undefined,
  queryName: string
) {
  const vc = studioCtx.focusedOrFirstViewCtx();
  const tpl = tableUuid
    ? getTplByUUID(studioCtx, tableUuid)
    : getFocusedTpl(studioCtx);

  if (!vc || !tpl || !isTplComponent(tpl)) {
    return false;
  }

  const queryParamVar = getParamVariable(tpl, "data");
  const queryArg = getTplComponentArg(tpl, tpl.vsettings[0], queryParamVar);

  return Boolean(
    queryArg &&
      isKnownObjectPath(queryArg.expr) &&
      isEqual(queryArg.expr.path, ["$queries", queryName])
  );
}

export async function isTableSelectRowsBy(
  studioCtx: StudioCtx,
  tableUuid?: string
) {
  const tpl = tableUuid
    ? getTplByUUID(studioCtx, tableUuid)
    : getFocusedTpl(studioCtx);

  if (!tpl || !isTplComponent(tpl)) {
    return false;
  }

  const canSelectRowsParamVar = getParamVariable(tpl, "canSelectRows");
  const canSelectRowsArg = getTplComponentArg(
    tpl,
    tpl.vsettings[0],
    canSelectRowsParamVar
  );

  return Boolean(
    canSelectRowsArg &&
      isKnownCustomCode(canSelectRowsArg.expr) &&
      canSelectRowsArg.expr.code === JSON.stringify("click")
  );
}

export function isVisible(selector: string) {
  const element = document.querySelector(selector);
  if (!element) {
    return false;
  }
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.display === "none") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

const VISIBILITY_MAX_WAIT = 1000 * 30; // 30 seconds

export async function waitElementToBeVisible(selector: string) {
  await waitUntil(() => isVisible(selector), {
    maxTimeout: VISIBILITY_MAX_WAIT,
  });
}

export async function waitElementToBeInvisible(selector: string) {
  await waitUntil(() => !isVisible(selector), {
    maxTimeout: VISIBILITY_MAX_WAIT,
  });
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function addDynamicPage(studioCtx: StudioCtx) {
  await studioCtx.change(({ success }) => {
    const page = studioCtx.addComponent("DynamicPage", {
      type: ComponentType.Page,
    });
    studioCtx.mergeOnboardingTourStateResults({
      dynamicPage: page.uuid,
    });
    return success();
  });
}

export async function changePagePath(
  studioCtx: StudioCtx,
  pageUuid: string,
  path: string
) {
  const page = studioCtx.site.components.find((c) => c.uuid === pageUuid);
  if (!page || !isPageComponent(page)) {
    return;
  }

  await studioCtx.tryChangePath(page, path);
}

const filtersTemplates = {
  ordersByShipCountry: {
    value: {
      tree: {
        id: "89babbb9-89ab-4cde-b012-3187ca6849ac",
        type: "group",
        properties: { conjunction: "AND" },
        children1: [
          {
            type: "rule",
            id: "8a999aa9-4567-489a-bcde-f187ca690511",
            properties: {
              field: '"ship_country"',
              operator: "equal",
              value: ["{{29556}}"],
              valueSrc: ["value"],
              valueType: ["text"],
            },
          },
        ],
      },
      fields: {
        '"customer_id"': { type: "text", label: "customer_id" },
        '"employee_id"': { type: "number", label: "employee_id" },
        '"freight"': { type: "number", label: "freight" },
        '"order_date"': { type: "date", label: "order_date" },
        '"order_id"': { type: "number", label: "order_id" },
        '"required_date"': { type: "date", label: "required_date" },
        '"ship_address"': { type: "text", label: "ship_address" },
        '"ship_city"': { type: "text", label: "ship_city" },
        '"ship_country"': { type: "text", label: "ship_country" },
        '"ship_name"': { type: "text", label: "ship_name" },
        '"ship_postal_code"': { type: "text", label: "ship_postal_code" },
        '"ship_region"': { type: "text", label: "ship_region" },
        '"ship_via"': { type: "number", label: "ship_via" },
        '"shipped_date"': { type: "date", label: "shipped_date" },
      },
    },
    bindings: {
      "{{29556}}": {
        path: ["$ctx", "params", "country"],
      },
    },
  },
  updateCustomersFromTable: {
    value: {
      tree: {
        id: "aabab9a8-89ab-4cde-b012-318947e893e4",
        type: "group",
        properties: {
          conjunction: "AND",
        },
        children1: [
          {
            type: "rule",
            id: "9ba8b8a8-89ab-4cde-b012-318947e8c0c4",
            properties: {
              field: "customer_id",
              operator: "equal",
              value: ["{{37131}}"],
              valueSrc: ["value"],
              valueType: ["text"],
            },
          },
        ],
      },
      fields: {
        address: {
          type: "text",
          label: "address",
        },
        city: {
          type: "text",
          label: "city",
        },
        company_name: {
          type: "text",
          label: "company_name",
        },
        contact_name: {
          type: "text",
          label: "contact_name",
        },
        contact_title: {
          type: "text",
          label: "contact_title",
        },
        country: {
          type: "text",
          label: "country",
        },
        customer_id: {
          type: "text",
          label: "customer_id",
        },
        fax: {
          type: "text",
          label: "fax",
        },
        phone: {
          type: "text",
          label: "phone",
        },
        postal_code: {
          type: "text",
          label: "postal_code",
        },
        region: {
          type: "text",
          label: "region",
        },
      },
    },
    bindings: {
      "{{37131}}": {
        code: "($state.table.selectedRow.customer_id)",
      },
    },
  },
};

const SCHEMA_TYPE_TO_FORM_ITEM_TYPE = {
  string: "Text",
};

const getParamVariable = (tpl: TplComponent, name: string) =>
  ensure(
    tpl.component.params.find((p) => p.variable.name === name),
    `component ${tpl.component.name} should have ${name} param`
  ).variable;

export async function ensureFocusedTpl(
  studioCtx: StudioCtx,
  selectableKey: string
) {
  const focusedTpl = getFocusedTpl(studioCtx);
  if (focusedTpl?.uuid !== selectableKey) {
    const vc = ensure(studioCtx.focusedOrFirstViewCtx(), "missing ViewCtx");
    const richTableSelectable = ensure(
      vc.getSelectableFromSelectionId(selectableKey),
      "missing rich table"
    );
    await studioCtx.change(({ success }) => {
      studioCtx
        .focusedViewCtx()
        ?.getViewOps()
        .tryFocusObj(richTableSelectable, {
          exact: true,
        });
      return success();
    });
  }
}

function getFocusedTpl(studioCtx: StudioCtx) {
  const vc = studioCtx.focusedOrFirstViewCtx();
  if (!vc) {
    return undefined;
  }
  return vc.focusedTpls()[0];
}

function getFocusedTplIfForm(studioCtx: StudioCtx) {
  const vc = studioCtx.focusedOrFirstViewCtx();
  if (!vc) {
    return undefined;
  }
  const focusedTpl = vc.focusedTpls()[0];
  if (
    focusedTpl &&
    isTplComponent(focusedTpl) &&
    focusedTpl.component.codeComponentMeta?.displayName === "Form"
  ) {
    return focusedTpl;
  }
  return undefined;
}

export async function isFormLayoutInline(
  studioCtx: StudioCtx,
  formUUID?: string
) {
  const tpl = formUUID
    ? getTplByUUID(studioCtx, formUUID)
    : getFocusedTplIfForm(studioCtx);

  const vc = studioCtx.focusedOrFirstViewCtx();
  if (!tpl || !vc || !isTplComponent(tpl)) {
    return false;
  }

  const inlineParamVar = getParamVariable(tpl, "layout");
  const inlineParamArg = getTplComponentArg(
    tpl,
    tpl.vsettings[0],
    inlineParamVar
  );

  return Boolean(
    inlineParamArg &&
      isKnownCustomCode(inlineParamArg.expr) &&
      inlineParamArg.expr.code === JSON.stringify("inline")
  );
}

async function updateFormItems(vc: ViewCtx, tpl: TplComponent, items: any[]) {
  await vc.studioCtx.change(({ success }) => {
    vc.variantTplMgr().setArg(
      tpl,
      getParamVariable(tpl, "formItems"),
      serCompositeExprMaybe(items)
    );

    return success();
  });
}

export function getFormItems(studioCtx: StudioCtx, formUUID?: string) {
  const tpl = formUUID
    ? getTplByUUID(studioCtx, formUUID)
    : getFocusedTplIfForm(studioCtx);

  const vc = studioCtx.focusedOrFirstViewCtx();
  if (!tpl || !vc || !isTplComponent(tpl)) {
    return [];
  }

  const formItemsVar = getParamVariable(tpl, "formItems");
  const formItemsArg = getTplComponentArg(tpl, tpl.vsettings[0], formItemsVar);

  if (!formItemsArg) {
    return [];
  }

  if (isKnownCompositeExpr(formItemsArg.expr)) {
    return deserCompositeExprMaybe(formItemsArg.expr);
  }

  const formItems = tryExtractJson(formItemsArg.expr) as any[];
  return formItems;
}

const FORM_ITEMS = [
  {
    id: "contact_name",
    type: "string",
  },
  {
    id: "contact_title",
    type: "string",
  },
  {
    id: "company_name",
    type: "string",
  },
];

export async function updateFormWithFormItems(
  studioCtx: StudioCtx,
  formUUID?: string
) {
  const tpl = formUUID
    ? getTplByUUID(studioCtx, formUUID)
    : getFocusedTplIfForm(studioCtx);

  const vc = studioCtx.focusedOrFirstViewCtx();
  if (!tpl || !vc || !isTplComponent(tpl)) {
    return;
  }

  await updateFormItems(
    vc,
    tpl,
    FORM_ITEMS.map((schema) => ({
      label: capitalize(schema.id.split("_").join(" ")),
      inputType: SCHEMA_TYPE_TO_FORM_ITEM_TYPE[schema.type],
      name: schema.id,
    }))
  );
}

export async function prepareFormOnSubmit(
  studioCtx: StudioCtx,
  formUUID?: string
) {
  const vc = studioCtx.focusedOrFirstViewCtx();
  const tpl = formUUID
    ? getTplByUUID(studioCtx, formUUID)
    : getFocusedTplIfForm(studioCtx);

  const tutorialDBMeta = await getTutorialDBMeta(studioCtx);

  if (!tpl || !vc || !isTplComponent(tpl) || !tutorialDBMeta) {
    return;
  }

  const component = tryGetTplOwnerComponent(tpl) ?? null;

  const updateMany = new DataSourceOpExpr({
    sourceId: tutorialDBMeta.id,
    opId: "temporary-id",
    opName: "updateMany",
    templates: {
      resource: mkDataSourceTemplate({
        fieldType: "table",
        value: new TemplatedString({
          text: [JSON.stringify(TUTORIAL_DB_META.northwind.tables.customers)],
        }),
        bindings: null,
      }),
      variables: mkDataSourceTemplate({
        fieldType: "json-schema",
        bindings: {
          "{{19000}}": new ObjectPath({
            path: ["$state", "form", "value"],
            fallback: null,
          }),
        },
        value: JSON.stringify("{{19000}}"),
      }),
      conditions: mkDataSourceTemplate({
        fieldType: "filter[]",
        value: JSON.stringify(filtersTemplates.updateCustomersFromTable.value),
        bindings: {
          ...mapValues(
            filtersTemplates.updateCustomersFromTable.bindings,
            (obj) => {
              return new TemplatedString({
                text: ["", code(obj.code, code("undefined")), ""],
              });
            }
          ),
        },
      }),
    },
    roleId: undefined,
    cacheKey: undefined,
    queryInvalidation: new QueryInvalidationExpr({
      invalidationQueries: [ALL_QUERIES.value],
      invalidationKeys: undefined,
    }),
    parent: undefined,
  });

  const { opId } = await studioCtx.appCtx.app.withSpinner(
    studioCtx.appCtx.api.getDataSourceOpId(
      studioCtx.siteInfo.id,
      tutorialDBMeta.id,
      {
        name: "updateMany",
        templates: {
          resource: dataSourceTemplateToString(updateMany.templates.resource, {
            projectFlags: studioCtx.projectFlags(),
            component,
            inStudio: true,
          }),
          variables: dataSourceTemplateToString(
            updateMany.templates.variables,
            {
              projectFlags: studioCtx.projectFlags(),
              component,
              inStudio: true,
            }
          ),
          conditions: dataSourceTemplateToString(
            updateMany.templates.conditions,
            {
              projectFlags: studioCtx.projectFlags(),
              component,
              inStudio: true,
            }
          ),
        },
        roleId: undefined,
      }
    )
  );

  await studioCtx.change(({ success }) => {
    updateMany.opId = opId;
    const eventHandler = new EventHandler({ interactions: [] });
    const interaction = mkInteraction(
      eventHandler,
      "dataSourceOp",
      `Use ${DATA_SOURCE_LOWER}`,
      {
        dataOp: updateMany,
      }
    );
    interaction.interactionName = "Update many";
    eventHandler.interactions.push(interaction);
    // TODO: replace with setEventHandlerByEventKey
    vc.variantTplMgr().setArg(
      tpl,
      getParamVariable(tpl, "onFinish"),
      eventHandler
    );

    return success();
  });
}

export const scrollIntoView = (selector: string) => {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView();
  }
};

export function isFormInitialValuesDynamic(studioCtx: StudioCtx) {
  const tpl = getFocusedTplIfForm(studioCtx);
  if (!tpl || !isTplComponent(tpl)) {
    return false;
  }

  const initialValuesParamVar = getParamVariable(tpl, "initialValues");
  const initialValuesArg = getTplComponentArg(
    tpl,
    tpl.vsettings[0],
    initialValuesParamVar
  );

  return Boolean(initialValuesArg && isKnownObjectPath(initialValuesArg.expr));
}

export function isFormInitialValuesProperlyLinked(studioCtx: StudioCtx) {
  const tpl = getFocusedTplIfForm(studioCtx);
  if (!tpl || !isTplComponent(tpl)) {
    return false;
  }

  const initialValuesParamVar = getParamVariable(tpl, "initialValues");
  const initialValuesArg = getTplComponentArg(
    tpl,
    tpl.vsettings[0],
    initialValuesParamVar
  );

  return Boolean(
    initialValuesArg &&
      isKnownObjectPath(initialValuesArg.expr) &&
      isEqual(initialValuesArg.expr.path, ["$state", "table", "selectedRow"])
  );
}

export function stepsToCypress(steps: StudioTutorialStep[]) {
  // TODO: outer frame steps
  // Play with the result to ensure it's working

  return steps
    .map((step, index) => {
      const cyTarget = step.highlightTarget ?? step.target;
      let cypressStep = `// #${step.name} - ${index + 1} / ${steps.length}\n`;

      cypressStep += `cy.get("#tour-popup-${step.name}").should("be.visible");\n`;

      if (step.name === "form-add") {
        cypressStep += `cy.insertFromAddDrawer("Form");\n`;
      } else if (step.name === "rich-table-add") {
        cypressStep += `cy.insertFromAddDrawer("Table");\n`;
      } else if (step.name === "configure-table") {
        cypressStep += `
cy.get('${cyTarget}').click();
cy.get(\`[data-key="'customers'"]\`).click();`;
      } else if (step.name === "data-query-switch-component-tab") {
        cypressStep += `cy.switchToDataTab();\n`;
      } else if (step.name === "configure-table-settings-tab") {
        cypressStep += `cy.switchToSettingsTab();\n`;
      } else if (step.name === "configure-table-select-rows") {
        cypressStep += `
cy.get('${cyTarget}').click();
cy.get(\`[data-key="'click'"]\`).click();\n`;
      } else if (step.name === "form-items-label") {
        cypressStep += `
cy.get('${cyTarget}').click();
cy.justType("Contact Name{enter}");
`;
      } else if (step.name === "form-items-name") {
        cypressStep += `
cy.get('${cyTarget}').click();
cy.justType("contact_name{enter}");
`;
      } else if (step.name === "form-initial-values-dynamic-value") {
        cypressStep += `
cy.get('${cyTarget}').rightclick();
cy.get("#use-dynamic-value-btn").click();
`;
      } else if (step.name === "form-initial-value-data-picker") {
        cypressStep += `
cy.get('${cyTarget}').click();
cy.get("#data-picker-save-btn").click();
`;
      } else if (step.name === "form-interaction-use-integration") {
        cypressStep += `
cy.get('${cyTarget}').click();
cy.get('[data-key="dataSourceOp"]').click();
`;
      } else if (step.nextButtonText) {
        // if there is a next button, click it
        cypressStep += `cy.get('#tour-primary-btn').click();\n`;
      } else {
        cypressStep += `cy.get('${cyTarget}').click();\n`;
      }

      if (step.name.includes("save")) {
        cypressStep += `cy.wait(700)\n`;
      } else if (
        step.name === "#part3-intro" ||
        step.name === "form-interaction-use-integration"
      ) {
        // part3-intro is here because of sleep(1700) in the waitFor for the step
        // form-interaction-use-integration is here because of slowness in creating the dataSourceOp
        cypressStep += `cy.wait(2500)\n`;
      } else {
        cypressStep += `cy.wait(300)\n`;
      }
      return cypressStep;
    })
    .join("\n");
}
