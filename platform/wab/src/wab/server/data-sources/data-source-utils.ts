import { makeAirtableFetcher } from "@/wab/server/data-sources/airtable-fetcher";
import { getMigratedUserPropsOpBundle } from "@/wab/server/data-sources/end-user-utils";
import { makeFakeFetcher } from "@/wab/server/data-sources/fake-fetcher";
import { makeGraphqlFetcher } from "@/wab/server/data-sources/graphql-fetcher";
import { makeHttpFetcher } from "@/wab/server/data-sources/http-fetcher";
import { makePostgresFetcher } from "@/wab/server/data-sources/postgres-fetcher";
import { makeSupabaseFetcher } from "@/wab/server/data-sources/supabase-fetcher";
import { makeTutorialDbFetcher } from "@/wab/server/data-sources/tutorialdb-fetcher";
import { makeZapierFetcher } from "@/wab/server/data-sources/zapier-fetcher";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { logger } from "@/wab/server/observability";
import { getOpEncryptionKey as getDataSourceOperationEncryptionKey } from "@/wab/server/secrets";
import { makeStableEncryptor } from "@/wab/server/util/crypt";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { FastBundler } from "@/wab/shared/bundler";
import { findAllDataSourceOpExprForComponent } from "@/wab/shared/cached-selectors";
import {
  assert,
  isLiteralObject,
  jsonClone,
  swallow,
} from "@/wab/shared/common";
import { ExprCtx } from "@/wab/shared/core/exprs";
import {
  GenericDataSource,
  getDataSourceMeta,
} from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  ArgMeta,
  DataSourceMeta,
  Filters,
  FiltersLogic,
  OperationMeta,
  OperationTemplate,
  RawPagination,
  coerceArgStringToType,
  dataSourceTemplateToString,
  isJsonType,
} from "@/wab/shared/data-sources-meta/data-sources";
import { buildSqlStringForFilterTemplateArg } from "@/wab/shared/data-sources/to-sql";
import { DEVFLAGS, getProjectFlags } from "@/wab/shared/devflags";
import {
  DataSourceUser,
  getDynamicStringSegments,
  isCurrentUserBinding,
  isCurrentUserCustomPropertiesBinding,
  isDynamicValue,
  removeQuotesFromBindings,
  smartSubstituteDynamicValues,
  substitutePlaceholder,
  templateSubstituteDynamicValues,
  withCurrentUserValues,
} from "@/wab/shared/dynamic-bindings";
import { stampIgnoreError } from "@/wab/shared/error-handling";
import { DataSourceOpExpr, Site } from "@/wab/shared/model/classes";
import { CrudFilter, CrudFilters, LogicalFilter } from "@pankod/refine-core";
import {
  Config,
  JsonTree,
  Utils as QbUtils,
} from "@react-awesome-query-builder/antd";
import { isUUID } from "class-validator";
import { isArray, isNil, isString, mapValues } from "lodash";
import { astMapper, parse, toSql } from "pgsql-ast-parser";
import { Connection } from "typeorm";

export type ParameterizedArgs = Record<
  string,
  {
    template: string;
    values: unknown[];
  }
>;

export async function executeDataSourceOperation(
  dbCon: Connection,
  source: GenericDataSource,
  operation: OperationTemplate,
  userArgs: Record<string, unknown> | undefined,
  fetchArgs: {
    paginate?: RawPagination;
  },
  currentUser: DataSourceUser | undefined,
  isStudioOp: boolean
) {
  const fetcher = await makeFetcher(dbCon, source);
  const sourceMeta = getDataSourceMeta(source.source);
  const opMeta =
    isStudioOp && sourceMeta.studioOps
      ? Object.entries(sourceMeta.studioOps)
          .map(([_, op]) => op as OperationMeta)
          .find((op) => op.name === operation.name)
      : sourceMeta.ops.find((op) => op.name === operation.name);
  if (!opMeta) {
    throw new Error(`Unknown operation ${source.source}.${operation.name}`);
  }
  logger().debug("Operation", {
    operation: operation.name,
    userArgs,
    fetchArgs,
  });
  const finalArgs = substituteArgs(
    source,
    opMeta,
    operation.templates,
    userArgs ?? {},
    currentUser
  );

  try {
    const result = await fetcher[opMeta.name]({ ...finalArgs, ...fetchArgs });
    // Always return valid JSON
    return result ?? null;
  } catch (err) {
    logger().error("Integration Error: ", err);
    throw stampIgnoreError(err);
  }
}

export async function makeFetcher(
  dbCon: Connection,
  source: GenericDataSource
  // eslint-disable-next-line @typescript-eslint/ban-types
): Promise<Object> {
  switch (source.source) {
    case "airtable":
      return makeAirtableFetcher(dbCon, source);
    case "http":
      return makeHttpFetcher(source);
    case "graphql":
      return makeGraphqlFetcher(source);
    case "supabase":
      return makeSupabaseFetcher(source);
    case "postgres":
      return makePostgresFetcher(source);
    case "zapier":
      return makeZapierFetcher(source);
    case "tutorialdb":
      return await makeTutorialDbFetcher(dbCon, source);
    case "fake":
      return await makeFakeFetcher(source);
  }
}

export function substituteArgs(
  source: GenericDataSource,
  op: OperationMeta,
  templatedArgs: Record<string, string>,
  userArgs: Record<string, unknown>,
  currentUser?: DataSourceUser
) {
  const newArgs: Record<string, any> = {};
  for (const [key, argMeta] of Object.entries(op.args)) {
    // Only allow args that are defined in op.args
    if (templatedArgs[key]) {
      // If this operation had templates defined, we must prefer those
      // values over liveArgs, which we don't trust
      const template = templatedArgs[key];
      let sqlString: string | undefined = undefined;
      if (argMeta.type === "filter[]" && argMeta.isSql) {
        sqlString = buildSqlStringForFilterTemplateArg(source, template);
      }
      if (isString(template) && isDynamicValue(template)) {
        // If this is indeed a template string, then perform substitution
        const subVals = userArgs[key];
        const substitutedArg = substituteTemplate(
          sqlString ?? template,
          isNil(subVals) ? [] : Array.isArray(subVals) ? subVals : [subVals],
          currentUser,
          argMeta.isParamString
            ? "paramString"
            : isJsonType(argMeta.type)
            ? "json"
            : "string"
        );
        if (typeof substitutedArg === "string") {
          newArgs[key] = coerceArgStringToType(substitutedArg, argMeta);
        } else {
          newArgs[key] = substitutedArg;
        }
      } else {
        // Otherwise, this is just a hard-coded value
        newArgs[key] = coerceArgStringToType(sqlString || template, argMeta);
      }
    } else {
      // If no templates defined, then we directly use whatever is
      // specified live
      newArgs[key] = userArgs[key];
    }
  }
  return newArgs;
}

export function substituteTemplate(
  template: string,
  values: unknown[],
  currentUser: DataSourceUser | undefined,
  strategy: "paramString" | "string" | "json"
) {
  const bindings = getDynamicStringSegments(template).filter((seg) =>
    isDynamicValue(seg)
  );
  const finalValues = withCurrentUserValues(
    template,
    bindings,
    values,
    currentUser
  ).map((v) => substitutePlaceholder(v));
  if (strategy === "paramString") {
    return parameterSubstituteDynamicValues(template, bindings, finalValues);
  } else if (strategy === "string") {
    return templateSubstituteDynamicValues(template, bindings, finalValues);
  } else if (strategy === "json") {
    return smartSubstituteDynamicValues(template, bindings, finalValues);
  } else {
    throw new Error(`Unexpected substitution strategy ${strategy}`);
  }
}

export const parameterSubstituteDynamicValues = (
  binding: string,
  subBindings: string[],
  subValues: unknown[]
) => {
  // if only one binding is provided in the whole string, we need to throw an error
  let finalBinding = removeQuotesFromBindings(binding);
  const parameters: Record<string, unknown> = {};
  // First replace bindings with a string we can find
  subBindings.forEach((b, i) => {
    const key = `__plasmic_binding_${i + 1}_`;
    finalBinding = finalBinding.replace(b, key);
    parameters[key] =
      typeof subValues[i] === "object" &&
      subValues[i] !== null &&
      !isArray(subValues[i])
        ? JSON.stringify(subValues[i], null, 2)
        : subValues[i];
  });
  // Then we parse the SQL string to replace templated string literals with
  // concatenation expressions. So, for example 'blah-{{ expr }}' becomes
  // ('blah' || $1).
  const ast = swallow(() => parse(finalBinding, "expr"));
  if (ast) {
    const mapper = astMapper((map) => ({
      constant: (v) => {
        if (v.type === "string" && v.value.includes("__plasmic_binding_")) {
          let val = v.value;
          val = val.replace(/__plasmic_binding_(\d+)_/g, "' || $$$1 || '");
          const expr = parse(`( '${val}' )`, "expr");
          return expr;
        }
        return map.super().constant(v);
      },
      ref: (ref) => {
        if (ref.name.match(/^__plasmic_binding_(\d+)_$/)) {
          return {
            type: "parameter",
            name: ref.name.replace(/__plasmic_binding_(\d+)_/, "$$$1"),
          };
        }
        return map.super().ref(ref);
      },
    }));
    const modified = mapper.expr(ast);
    if (modified) {
      finalBinding = toSql.expr(modified);
    }
  } else {
    // If we fail to parse, just replace __plasmic_binding with $1, $2, ...
    subBindings.forEach((_v, i) => {
      const key = `__plasmic_binding_${i + 1}_`;
      const param = `$${i + 1}`;
      finalBinding = finalBinding.replace(key, param);
    });
  }
  return { value: finalBinding, parameters };
};

const encryptor = makeStableEncryptor(getDataSourceOperationEncryptionKey());
export async function makeDataSourceOperationId(
  mgr: DbMgr,
  dataSourceId: string,
  op: OperationTemplate
): Promise<string> {
  const dataSourceOperation = await mgr.existsDataSourceOperation(
    op,
    dataSourceId
  );
  if (dataSourceOperation) {
    return dataSourceOperation.id;
  }
  return (await mgr.createDataSourceOperation(op, dataSourceId)).id;
}

export async function getDataSourceOperation(
  mgr: DbMgr,
  dataSourceId: string,
  str: string
) {
  if (isUUID(str)) {
    const dataSourceOperation = await mgr.getDataSourceOperation(str);
    assert(
      dataSourceOperation !== undefined &&
        dataSourceOperation.dataSourceId === dataSourceId,
      `Unable to find data source operation ${str} for data source ${dataSourceId}`
    );
    return dataSourceOperation.operationInfo;
  }
  return JSON.parse(encryptor.from(str)) as OperationTemplate;
}

const JSON_LOGIC_TO_REFINE_OPERATORS = {
  "===": "eq",
  "==": "eq",
  "!==": "ne",
  "!=": "ne",
  ">": "gt",
  ">=": "gte",
  "<": "lt",
  "<=": "lte",
  inArray: "in",
  inString: "contains",
  in: "contains",
} as const;

export const JSON_LOGIC_REVERSE_OPERATORS = {
  ">=": "<=",
  "<=": ">=",
  ">": "<",
  "<": ">",
} as const;

/**
 * Attempts to convert Json Logic filters to Refine's CrudFilters.
 * Unfortunately the CrudFilters are pretty limited, and only supports
 * a conjunction of disjunctions. We may need to either similarly limit
 * query builder, or will need to work around Refine.
 */
export function filtersToRefineFilters(
  filters: Filters,
  config: Config
): CrudFilters {
  const filtersLogic = filters.tree
    ? toJsonLogicFormat(filters.tree, config)
    : filters.logic;
  if (!filtersLogic) {
    return [];
  }
  const transform = (logic: FiltersLogic): CrudFilters | CrudFilter => {
    if ("or" in logic) {
      return {
        operator: "or",
        value: logic.or.map((c) => transform(c as any) as LogicalFilter),
      };
    } else if ("!" in logic) {
      const res = transform(logic["!"]);
      const operator = Object.keys(res)[0];
      return {
        ...res,
        operator: `n${operator}`,
      } as CrudFilter;
    } else if ("in" in logic) {
      const [value, field] = logic.in as any[];
      return {
        operator: JSON_LOGIC_TO_REFINE_OPERATORS["in"],
        field: field.var,
        value,
      };
    } else {
      const operator = Object.keys(logic)[0];
      if (logic[operator].length === 3) {
        const reverseOperator = JSON_LOGIC_REVERSE_OPERATORS[operator];
        const field = logic[operator][1].var;
        const value1 = logic[operator][0];
        const value2 = logic[operator][2];
        return [
          {
            operator: JSON_LOGIC_TO_REFINE_OPERATORS[operator],
            field,
            value: value2,
          },
          {
            operator: JSON_LOGIC_TO_REFINE_OPERATORS[reverseOperator],
            field,
            value: value1,
          },
        ];
      } else {
        const field = logic[operator][0].var;
        const value = logic[operator][1];
        return {
          operator: JSON_LOGIC_TO_REFINE_OPERATORS[operator],
          field,
          value,
        };
      }
    }
  };

  if ("and" in filtersLogic) {
    return filtersLogic.and.flatMap((x) => transform(x as any));
  } else {
    const transformed = transform(filtersLogic as FiltersLogic);
    return Array.isArray(transformed) ? transformed : [transformed];
  }
}

export function toJsonLogicFormat(
  tree: JsonTree,
  config: Config
): FiltersLogic | undefined {
  const res = QbUtils.jsonLogicFormat(QbUtils.loadTree(tree), config);
  assert(
    !res.errors?.length,
    () => `Failed to convert to JsonLogic: ${(res.errors ?? []).join("; ")}`
  );
  return res.logic as FiltersLogic | undefined;
}

async function updateDataSourceExprSourceId(
  dbMgr: DbMgr,
  expr: DataSourceOpExpr,
  oldToNewSourceIds: Record<string, string>,
  exprCtx: ExprCtx,
  oldToNewRoleIds: Record<string, string> = {}
) {
  const operation: OperationTemplate = {
    name: expr.opName,
    roleId: expr.roleId,
    templates: mapValues(expr.templates, (v) =>
      dataSourceTemplateToString(v, exprCtx)
    ),
  };

  const oldSourceId = expr.sourceId;

  const sourceId =
    expr.sourceId in oldToNewSourceIds
      ? oldToNewSourceIds[expr.sourceId]
      : expr.sourceId;

  // If the sourceId changed, this should be a tutorialdb data source
  // which we can issue a new operation id for it
  if (oldSourceId !== sourceId) {
    const newOpId = await makeDataSourceOperationId(dbMgr, sourceId, operation);
    expr.opId = newOpId;
    expr.sourceId = sourceId;
  } else {
    const isNewRoleId =
      expr.roleId && Object.values(oldToNewRoleIds).includes(expr.roleId);

    // If the data source is the same, but only the role has changed, we need
    // to check user permissions to see if the user has access to the database
    // which would allow them to issue a new operation id
    if (isNewRoleId) {
      try {
        // makeDataSourceOperationId will throw if the user does not have
        // at least editor permission
        const newOpId = await makeDataSourceOperationId(
          dbMgr,
          sourceId,
          operation
        );
        expr.opId = newOpId;
      } catch (err) {
        // We won't fail here, as this state of project even though it is not properly represeting
        // the expression, it may still be valid as a template
        logger().error(
          `Error trying to issue dataSourceOpId user does not have permission to access data source ${sourceId}`
        );
      }
    }
  }
}

export async function reevaluateDataSourceExprOpIds(
  dbMgr: DbMgr,
  site: Site,
  oldToNewSourceIds: Record<string, string>,
  oldToNewRoleIds: Record<string, string> = {}
) {
  await Promise.all(
    site.components.map(async (component) => {
      await Promise.all(
        findAllDataSourceOpExprForComponent(component).map(async (opExpr) => {
          await updateDataSourceExprSourceId(
            dbMgr,
            opExpr,
            oldToNewSourceIds,
            {
              projectFlags: getProjectFlags(site),
              component,
              inStudio: true,
            },
            oldToNewRoleIds
          );
        })
      );
    })
  );
}

const USER_PROPS_BUNDLE_UUID = "currentUserOpExpr";

export async function reevaluateAppAuthUserPropsOpId(
  dbMgr: DbMgr,
  fromProjectId: ProjectId,
  toProjectId: ProjectId,
  oldToNewSourceIds: Record<string, string>,
  oldToNewRoleIds: Record<string, string> = {}
) {
  const appConfig = await dbMgr.getAppAuthConfig(fromProjectId, true);
  if (!appConfig || !appConfig.userPropsBundledOp) {
    return;
  }

  const userPropsBundledOp = appConfig.userPropsBundledOp;

  const migratedBundle = await getMigratedUserPropsOpBundle(
    dbMgr,
    fromProjectId,
    userPropsBundledOp
  );
  const bundler = new FastBundler();
  const expr = bundler.unbundle(
    migratedBundle,
    USER_PROPS_BUNDLE_UUID
  ) as DataSourceOpExpr;

  await updateDataSourceExprSourceId(
    dbMgr,
    expr,
    oldToNewSourceIds,
    {
      projectFlags: jsonClone(DEVFLAGS),
      component: null,
      inStudio: true,
    },
    oldToNewRoleIds
  );

  const updatedBundle = bundler.bundle(
    expr,
    USER_PROPS_BUNDLE_UUID,
    await getLastBundleVersion()
  );

  await dbMgr.upsertAppAuthConfig(toProjectId, {
    userPropsOpId: expr.opId,
    userPropsBundledOp: JSON.stringify(updatedBundle),
    userPropsDataSourceId: expr.sourceId,
  });
}

/**
 * Returns a version of OperationTemplate where the dynamic string segments are
 * all replaced with `{{ DYNAMIC }}`.  That means different operations with
 * different dynamic expressions will have the same OperationTemplate. This is
 * only useful for server-execution of operations, as server doesn't care what
 * the dynamic expression actually is.
 */
export function normalizeOperationTemplate(
  sourceMeta: DataSourceMeta,
  opTemplate: OperationTemplate
): OperationTemplate {
  const op = sourceMeta.ops.find((op_) => op_.name === opTemplate.name);

  const normalized = {
    ...opTemplate,
    templates: mapValues(opTemplate.templates, (val, key) =>
      normTemplate(op?.args[key], val)
    ),
  };
  logger().info("NORMALIZED", normalized);
  return normalized;
}

function normTemplate(argMeta: ArgMeta | undefined, template: any) {
  let bindingCount = 0;
  if (typeof template === "string" && isDynamicValue(template)) {
    const bindings = getDynamicStringSegments(template).filter((seg) =>
      isDynamicValue(seg)
    );
    for (const binding of bindings) {
      // We want to replace all dynamic bindings with placeholder
      // {{ DYNAMIC }}.  But we make an exception for {{ currentUser }}
      // bindings, as that those bindings are evaluated on the server.
      if (isCurrentUserBinding(binding.substring(2, binding.length - 2))) {
        continue;
      }
      template = template.replace(binding, `{{ DYNAMIC${bindingCount} }}`);
      bindingCount += 1;
    }

    if (argMeta && argMeta.type === "filter[]") {
      // When react-query-builder serializes its tree into json,
      // it uses generated ids for tree nodes.  We normalize
      // those ids.
      // We can't just JSON.parse(template), because the
      // `{{ DYNAMIC* }}` strings break the json syntax.  Instead,
      // we substitute with dummy values to get a real JSON string,
      // extract out ids, and then replace them with normalized ids
      const fakeUserArgs = new Array<number>(bindings.length).fill(1);
      const substituted = substituteTemplate(
        template,
        fakeUserArgs,
        undefined,
        "json"
      ) as string;

      const extractIdMapping = () => {
        try {
          const parsed = JSON.parse(substituted);
          let cur = 0;
          const mapped: Record<string, string> = {};
          const mapId = (id: string) => {
            if (!(id in mapped)) {
              mapped[id] = `$p$${cur}`;
              cur += 1;
            }
            return mapped[id];
          };
          const visit = (node: any) => {
            if (!node) {
              return;
            }
            if (Array.isArray(node)) {
              node.forEach((x) => visit(x));
            } else if (isLiteralObject(node)) {
              if ("type" in node && "id" in node) {
                node.id = mapId(node.id);
              }
              for (const val of Object.values(node)) {
                visit(val);
              }
            }
          };

          visit(parsed.tree);
          return mapped;
        } catch (err) {
          logger().error(
            `Error parsing react-query-builder template: ${err}: ${substituted}`
          );
          return undefined;
        }
      };

      const idMappings = extractIdMapping();
      if (idMappings) {
        for (const [fromId, toId] of Object.entries(idMappings)) {
          template = template.replace(`"id":"${fromId}"`, `"id":"${toId}"`);
        }
      }
    }
  }
  return template;
}

export function getOperationCurrentUserUsage(op: OperationTemplate) {
  const opDynamicStrings = Object.values(op.templates).flatMap((template) => {
    return getDynamicStringSegments(template).filter((seg) =>
      isDynamicValue(seg)
    );
  });
  return {
    usesAuth: !!op.roleId,
    usesCurrentUser: opDynamicStrings.some((seg) =>
      isCurrentUserBinding(seg.substring(2, seg.length - 2))
    ),
    usesCurrentUserCustomProperties: opDynamicStrings.some((seg) =>
      isCurrentUserCustomPropertiesBinding(seg.substring(2, seg.length - 2))
    ),
  };
}
