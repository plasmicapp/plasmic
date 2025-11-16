import S from "@/wab/client/components/QueryBuilder/QueryBuilder.module.scss";
import "@/wab/client/components/QueryBuilder/QueryBuilder.scss";
import {
  AwesomeBuilder,
  QueryBuilderConfig,
} from "@/wab/client/components/QueryBuilder/QueryBuilderConfig";
import { getEmptyTree } from "@/wab/client/components/QueryBuilder/query-builder-utils";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { DataPickerWidgetFactory } from "@/wab/client/components/sidebar-tabs/DataSource/DataPickerWidgetFactory";
import { mkBindingId } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { TemplatedTextWidget } from "@/wab/client/components/sidebar-tabs/DataSource/TemplatedTextWidget";
import { arrayEq, ensure } from "@/wab/shared/common";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { Filters } from "@/wab/shared/data-sources-meta/data-sources";
import { isDynamicValue } from "@/wab/shared/dynamic-bindings";
import {
  CustomCode,
  ObjectPath,
  TemplatedString,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
import {
  BaseWidgetProps,
  Config,
  Fields,
  ImmutableTree,
  JsonTree,
  Utils as QbUtils,
  Query,
  TextWidgetProps,
} from "@react-awesome-query-builder/antd";
import cn from "classnames";
import { isNil, isString, merge, pick } from "lodash";
import * as React from "react";

const InitialConfig = QueryBuilderConfig;

const baseConfig: Config = {
  ...InitialConfig,
};

interface DataSourceQueryBuilderProps {
  saveTree: (
    data: Filters,
    bindings: Record<string, TemplatedString | CustomCode | ObjectPath>
  ) => void;
  logic?: any;
  tree: JsonTree | undefined;
  fields: Fields;
  dataSourceConfig: Config;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  bindings: Record<string, TemplatedString | CustomCode | ObjectPath>;
  exprCtx: ExprCtx;
}

function DataSourceQueryBuilder_(
  props: DataSourceQueryBuilderProps,
  outerRef: React.Ref<HTMLDivElement>
) {
  const {
    saveTree,
    logic,
    tree,
    fields: defaultFields,
    dataSourceConfig,
    data,
    schema,
    bindings: defaultBindings,
    exprCtx,
  } = props;

  const fields = Object.entries(defaultFields)
    .filter(([_key, field]) => field.type !== "json")
    .reduce((acum, [key, value]) => {
      acum[key] = value;
      if (acum[key].type === "string") {
        acum[key].type = "text";
      } else if (acum[key].type === "enum") {
        acum[key].type = "select";
      }
      return acum;
    }, {} as Fields);

  const config = React.useMemo(() => {
    const mergedConfig = merge({}, baseConfig, dataSourceConfig);

    return {
      ...mergedConfig,
      fields: {
        ...fields,
      },
    } as Config;
  }, [dataSourceConfig, fields]);

  // We create a ref to `data` to use it in query builder widgets factory
  // below, so that the widget factory always use the latest/current
  // data.
  const curData = React.useRef<Record<string, any> | undefined>(undefined);
  React.useEffect(() => {
    curData.current = data;
  }, [data]);

  const types = React.useMemo(
    () => ["boolean", "number", "datetime", "date", "select"],
    []
  );

  const [state, setState] = React.useState<{
    tree: ImmutableTree;
    config: Config;
  }>(() => {
    const initialWidgetsConfig = {
      widgets: {
        text: {
          factory: (textProps: TextWidgetProps) => {
            const setValue = (expr: TemplatedString) => {
              const binding = mkBindingId();
              bindings.current = {
                ...bindings.current,
                [binding]: expr,
              };
              if (isKnownTemplatedString(expr) && arrayEq(expr.text, [""])) {
                textProps.setValue(undefined);
              } else {
                textProps.setValue(binding);
              }
            };
            return (
              <TemplatedTextWidget
                {...textProps}
                setValue={setValue}
                exprCtx={exprCtx}
                data={curData.current}
                schema={schema}
                bindings={bindings.current}
              />
            );
          },
        },
        ...Object.fromEntries(
          types.map((widgetType) => [
            `${widgetType}-custom`,
            {
              type: `${widgetType}-custom`,
              factory: (widgetProps: BaseWidgetProps) => {
                const setValue = (
                  expr: CustomCode | ObjectPath | null | undefined
                ) => {
                  if (isNil(expr)) {
                    widgetProps.setValue(undefined);
                    return;
                  }
                  const binding = mkBindingId();
                  bindings.current = {
                    ...bindings.current,
                    [binding]: expr,
                  };
                  widgetProps.setValue(binding);
                };
                return (
                  <DataPickerWidgetFactory
                    widgetProps={widgetProps}
                    setValue={setValue}
                    bindings={bindings.current}
                    data={curData.current}
                    schema={schema}
                    originalFactory={ensure(
                      baseConfig.widgets[widgetType]["factory"],
                      () => `No factory for widget: ${widgetType}`
                    )}
                    exprCtx={exprCtx}
                  />
                );
              },
            },
          ])
        ),
      },
      types: Object.fromEntries(
        types.map((type) => [
          `${type}-custom`,
          {
            widgets: {
              [`${type}-custom`]: {
                operators: config.types[type].widgets[type].operators,
              },
            },
            mainWidget: `${type}-custom`,
            ...pick(
              config.types[type],
              "excludeOperators",
              "defaultOperator",
              "valueSources"
            ),
          },
        ])
      ),
      fields: Object.fromEntries(
        Object.entries(config.fields)
          .filter(([_field, fieldConfig]) => types.includes(fieldConfig.type))
          .map(([field, fieldConfig]) => [
            field,
            {
              ...fieldConfig,
              type: `${fieldConfig.type}-custom`,
              widgets: {
                [`${fieldConfig.type}-custom`]: {
                  operators: fieldConfig["operators"] && [
                    ...fieldConfig["operators"],
                  ],
                },
              },
              fieldSettings: {
                validateValue: (v) => {
                  // TODO: Better validation for select / datetime?
                  return (
                    (isString(v) && isDynamicValue(v)) ||
                    typeof v === fieldConfig.type ||
                    `${typeof v}-custom` === fieldConfig.type ||
                    (fieldConfig.type === "select" && isString(v)) ||
                    (fieldConfig.type === "datetime" && isString(v)) ||
                    (fieldConfig.type === "date" && isString(v))
                  );
                },
              },
            },
          ])
      ),
    };
    return {
      tree:
        (tree
          ? QbUtils.loadTree(tree)
          : QbUtils.loadFromJsonLogic(
              logic,
              merge({}, config, initialWidgetsConfig)
            )) ??
        QbUtils.loadTree(
          getEmptyTree(merge({}, config, initialWidgetsConfig), {
            appendFirstField: true,
          })
        ),
      config: merge({}, config, initialWidgetsConfig),
    };
  });

  const bindings = React.useRef(defaultBindings);

  const fixBindings = (jsonTree: string) => {
    for (const key in bindings.current) {
      if (!jsonTree.includes(key)) {
        delete bindings.current[key];
      }
    }
  };

  const handleChange = (_tree, _config) => {
    setState({ tree: _tree, config: _config });
    const jsonTree = QbUtils.getTree(_tree);
    fixBindings(JSON.stringify(jsonTree));
    saveTree({ tree: jsonTree, fields: fields }, bindings.current);
  };

  return (
    <div
      className={cn("plasmic-query-builder-scope", S.plasmicQueryBuilderScope)}
      ref={outerRef}
    >
      <Query
        {...state.config}
        value={state.tree}
        onChange={handleChange}
        renderBuilder={AwesomeBuilder}
      />
    </div>
  );
}

const DataSourceQueryBuilder = React.forwardRef(DataSourceQueryBuilder_);
export default DataSourceQueryBuilder;
