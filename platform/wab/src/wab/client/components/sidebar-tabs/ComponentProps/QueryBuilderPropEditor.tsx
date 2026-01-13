import { DataPickerWidgetFactory } from "@/wab/client/components/QueryBuilder/Components/DataPickerWidgetFactory";
import { getEmptyTree } from "@/wab/client/components/QueryBuilder/query-builder-utils";
import S from "@/wab/client/components/QueryBuilder/QueryBuilder.module.scss";
import "@/wab/client/components/QueryBuilder/QueryBuilder.scss";
import {
  AwesomeBuilder,
  createQueryBuilderConfig,
  QueryBuilderConfig,
} from "@/wab/client/components/QueryBuilder/QueryBuilderConfig";
import { usePropValueEditorContext } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { ensure } from "@/wab/shared/common";
import {
  deserCompositeExpr,
  serCompositeExprMaybe,
} from "@/wab/shared/core/exprs";
import {
  CompositeExpr,
  CustomCode,
  isKnownCompositeExpr,
  ObjectPath,
} from "@/wab/shared/model/classes";
import {
  Config,
  ConfigContext,
  ImmutableTree,
  Utils as QbUtils,
  Query,
  WidgetProps,
} from "@react-awesome-query-builder/antd";
import cn from "classnames";
import type { RulesLogic } from "json-logic-js";
import { merge } from "lodash";
import React, { useMemo, useState } from "react";
import type { PartialDeep } from "type-fest";

/**
 * The query builder's value will be a static CustomCode,
 * or a CompositeExpr if any fields are dynamic values.
 * Both should evaluate to RulesLogic.
 */
export type QueryBuilderValue = CustomCode | CompositeExpr;

export interface QueryBuilderPropEditorProps {
  /**
   * Config passed in from meta.
   *
   * We allow the user to pass in any serializable react-awesome-query-builder
   * config format.
   */
  config: PartialDeep<Config>;
  /** Accepts RulesLogic since some call sites extract JSON from CustomCode. */
  value: RulesLogic | QueryBuilderValue | undefined;
  onChange: (value: QueryBuilderValue) => void;
  disabled?: boolean;
}

const baseConfig: Config = {
  ...QueryBuilderConfig,
};

/**
 * An editor for queries like `name = "John" AND age >= 30`.
 * The consumer receives the query in the JsonLogic data format:
 * ```json
 * {
 *   "and": [
 *     { "==": [{ "var": "name" }, "John"] },
 *     { ">=": [{ "var": "age" }, 30] }
 *   ]
 * }
 * ```
 */
function QueryBuilderPropEditor_(
  { config, value, onChange, disabled = false }: QueryBuilderPropEditorProps,
  outerRef: React.Ref<HTMLDivElement>
) {
  const finalConfig = useMemo<Config>(() => {
    const baseUserConfig = createQueryBuilderConfig(config ?? { fields: {} }, {
      readonly: disabled,
    });

    const types = ["boolean", "number", "datetime", "date", "select", "text"];
    const newWidgets: Config["widgets"] = Object.fromEntries(
      types.map((type) => {
        const originalFactory = ensure(
          baseConfig.widgets[type]["factory"] as (
            props: WidgetProps,
            context?: ConfigContext
          ) => React.ReactElement,
          () => `missing base widget: ${type}`
        );
        const dynamicType = toDynamicTypeName(type);
        return [
          dynamicType,
          {
            type: dynamicType,
            factory: (
              widgetProps: WidgetProps | undefined,
              context: ConfigContext | undefined
            ) => {
              if (!widgetProps) {
                return <></>;
              }
              return (
                <DataPickerWidgetFactoryWithContext
                  widgetProps={widgetProps}
                  setValue={widgetProps.setValue}
                  renderOriginalWidget={() =>
                    originalFactory(widgetProps, context)
                  }
                />
              );
            },
          },
        ];
      })
    );
    const typeOverrides: Config["types"] = Object.fromEntries(
      types.map((type) => {
        const originalType = ensure(
          baseUserConfig.types[type],
          "missing base type"
        );
        const originalTypeWidget = ensure(
          originalType.widgets[type],
          "missing base type widgets"
        );
        const dynamicType = toDynamicTypeName(type);
        return [
          type,
          {
            widgets: {
              [dynamicType]: originalTypeWidget,
            },
            mainWidget: dynamicType, // Default to dynamic widget
          },
        ];
      })
    );

    Object.values(baseUserConfig.fields).forEach((field) => {
      // For the dynamic widget to work for select/mutliselect widgets,
      // `allowCustomValues` must be true, but it defaults to be false.
      if (field.type === "select" || field.type === "multiselect") {
        if (field.fieldSettings?.["allowCustomValues"] !== false) {
          // Unless the user has explicitly disabled it,
          // we enable it so that dynamic values work.
          field.fieldSettings = {
            ...(field.fieldSettings ?? {}),
            allowCustomValues: true,
          };
        } else {
          // Otherwise, prefer the original widget without an option to make
          // the field dynamic, since dynamic values won't work anyway.
          field.preferWidgets = [...(field.preferWidgets ?? []), field.type];
        }
      }
    });

    return merge({}, baseUserConfig, {
      widgets: newWidgets,
      types: typeOverrides,
    });
  }, [JSON.stringify(config), disabled]);

  const [tree, setTree] = useState<ImmutableTree>(() => {
    const jsonLogic = isKnownCompositeExpr(value)
      ? (deserCompositeExpr(value) as RulesLogic)
      : value;
    let initialTree = jsonLogic
      ? QbUtils.loadFromJsonLogic(jsonLogic, finalConfig)
      : null;
    if (!initialTree) {
      initialTree = QbUtils.loadTree(getEmptyTree(finalConfig));
    }
    return initialTree;
  });

  return (
    <div
      className={cn("plasmic-query-builder-scope", S.plasmicQueryBuilderScope)}
      ref={outerRef}
    >
      <Query
        {...finalConfig}
        value={tree}
        onChange={(newTree) => {
          if (disabled) {
            return;
          }

          setTree(newTree);
          const result = QbUtils.jsonLogicFormat(newTree, finalConfig);
          if (result.errors && result.errors.length > 0) {
            console.error(result.errors);
          } else {
            const finalResult = serCompositeExprMaybe(
              result.logic as RulesLogic
            );
            onChange(finalResult);
          }
        }}
        renderBuilder={AwesomeBuilder}
      />
    </div>
  );
}
export const QueryBuilderPropEditor = React.forwardRef(QueryBuilderPropEditor_);

/**
 * Wrapper that uses PropValueEditorContext to automatically provide
 * data, schema, and exprCtx to DataPickerWidgetFactory.
 */
function DataPickerWidgetFactoryWithContext({
  widgetProps,
  setValue,
  renderOriginalWidget,
}: {
  widgetProps: WidgetProps;
  setValue: (expr: CustomCode | ObjectPath | null | undefined) => void;
  renderOriginalWidget: () => React.ReactElement;
}): React.ReactElement {
  const { env, schema, exprCtx } = usePropValueEditorContext();
  return (
    <DataPickerWidgetFactory
      widgetProps={widgetProps}
      setValue={setValue}
      renderOriginalWidget={renderOriginalWidget}
      data={env}
      schema={schema}
      exprCtx={ensure(exprCtx, "exprCtx missing")}
    />
  );
}

/** Modified widget name for widgets that support dynamic values. */
function toDynamicTypeName(name: string): string {
  return `${name}-dynamic`;
}
