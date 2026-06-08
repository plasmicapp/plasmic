import {
  ControlExtras,
  InnerPropEditorRow,
  PropValueEditorContext,
  PropValueEditorContextData,
  isPropShown,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { MaybeCollapsibleRow } from "@/wab/client/components/sidebar/SidebarSection";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  StudioPropType,
  customFunctionId,
  isAdvancedProp,
  isFlattenedObjectPropType,
  maybePropTypeToDisplayName,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import {
  clone,
  codeLit,
  deserCompositeExpr,
  serCompositeExprMaybe,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import {
  ArgType,
  CustomFunction,
  Expr,
  FunctionArg,
  isKnownCompositeExpr,
  isKnownExpr,
} from "@/wab/shared/model/classes";
import { smartHumanize } from "@/wab/shared/strs";
import { omit } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

/**
 * Decompose an object expr into a mixed-value object
 * where values are either plain values or Exprs.
 */
const decomposeObjExpr = (expr: Expr | undefined): Record<string, any> => {
  if (!expr) {
    return {};
  }
  if (isKnownCompositeExpr(expr)) {
    const result = deserCompositeExpr(expr);
    return typeof result === "object" &&
      result !== null &&
      !Array.isArray(result)
      ? (result as Record<string, any>)
      : {};
  }
  const json = tryExtractJson(expr);
  return json && typeof json === "object" && !Array.isArray(json) ? json : {};
};

/**
 * Compute the propType for a custom function parameter, using registered
 * metadata if available, falling back to the wab type.
 */
export function propTypeForParam(
  param: ArgType,
  func: CustomFunction,
  studioCtx: StudioCtx
): StudioPropType<any> {
  return (
    (studioCtx
      .getRegisteredFunctionsMap()
      .get(customFunctionId(func))
      ?.meta.params?.find(
        (p) => p.name === param.argName
      ) as StudioPropType<any>) ?? wabTypeToPropType(param.type)
  );
}

interface ServerQueryParamRowProps {
  attr: string;
  propType: StudioPropType<any>;
  expr: Expr | undefined;
  label: string;
  valueSetState: "isSet" | undefined;
  onChange: (newVal: any) => void;
  onDelete?: () => void;
  propValueEditorContext: PropValueEditorContextData;
  controlExtras: ControlExtras;
}

export const ServerQueryParamRow = observer(function ServerQueryParamRow(
  props: ServerQueryParamRowProps
) {
  const {
    attr,
    propType,
    expr,
    label,
    valueSetState,
    onChange,
    onDelete,
    propValueEditorContext,
    controlExtras,
  } = props;
  return (
    <PropValueEditorContext.Provider value={propValueEditorContext}>
      <InnerPropEditorRow
        attr={attr}
        propType={propType}
        expr={expr}
        label={label}
        valueSetState={valueSetState}
        onChange={onChange}
        onDelete={onDelete}
        controlExtras={controlExtras}
      />
    </PropValueEditorContext.Provider>
  );
});

/**
 * Get custom function parameter row items.
 * Flattened objects expand to one row per field, normal params produce a single row.
 */
export function getServerQueryParamRowItems(opts: {
  param: ArgType;
  argsMap: Record<string, FunctionArg[]>;
  propType: StudioPropType<any>;
  propValueEditorContext: PropValueEditorContextData;
  onParamChange: (param: ArgType, newExpr: Expr) => void;
  onParamDelete: (param: ArgType) => void;
}): MaybeCollapsibleRow[] {
  const {
    param,
    argsMap,
    propType,
    propValueEditorContext,
    onParamChange,
    onParamDelete,
  } = opts;
  const mkControlExtras = (path: (string | number)[]): ControlExtras => ({
    path,
  });

  // Check if the top-level param should be hidden
  if (
    !isPropShown(
      propType,
      propValueEditorContext.componentPropValues,
      propValueEditorContext.ccContextData,
      mkControlExtras([param.argName])
    )
  ) {
    return [];
  }

  // Expand flattened fields into their own rows to support advanced/collapse
  const flattenedFields = isFlattenedObjectPropType(propType)
    ? propType.fields
    : undefined;

  if (flattenedFields) {
    const curArg =
      param.argName in argsMap ? argsMap[param.argName][0] : undefined;
    const curObj = decomposeObjExpr(curArg?.expr);

    // Re-read the current arg to avoid stale closures, apply `transform` to the
    // decomposed object, then re-serialize and commit back to the param.
    const updateObj = (
      transform: (obj: Record<string, any>) => Record<string, any>
    ) => {
      const existingArg =
        param.argName in argsMap ? argsMap[param.argName][0] : undefined;
      const existingObj = decomposeObjExpr(existingArg?.expr);
      const newExpr = clone(serCompositeExprMaybe(transform(existingObj)));
      onParamChange(param, newExpr);
    };

    return Object.entries(flattenedFields)
      .filter(([fieldName, fieldPropType]) =>
        isPropShown(
          fieldPropType,
          propValueEditorContext.componentPropValues,
          propValueEditorContext.ccContextData,
          mkControlExtras([param.argName, fieldName])
        )
      )
      .map(([fieldName, fieldPropType]) => {
        const controlExtras = mkControlExtras([param.argName, fieldName]);
        const fieldLabel =
          maybePropTypeToDisplayName(fieldPropType) ?? smartHumanize(fieldName);
        const fieldValue = curObj[fieldName];
        // Preserve exprs and wrap plain values in codeLit
        const fieldExpr = isKnownExpr(fieldValue)
          ? fieldValue
          : fieldValue !== undefined
          ? codeLit(fieldValue)
          : undefined;

        return {
          collapsible: !!isAdvancedProp(fieldPropType, undefined),
          content: (
            <ServerQueryParamRow
              attr={fieldName}
              propType={fieldPropType}
              expr={fieldExpr}
              label={fieldLabel}
              valueSetState={fieldValue !== undefined ? "isSet" : undefined}
              propValueEditorContext={propValueEditorContext}
              controlExtras={controlExtras}
              onChange={(newFieldVal) =>
                updateObj((obj) => ({ ...obj, [fieldName]: newFieldVal }))
              }
              onDelete={
                fieldValue !== undefined
                  ? () => updateObj((obj) => omit(obj, fieldName))
                  : undefined
              }
            />
          ),
        };
      });
  }

  // Non-flattened params render as a single row
  const argLabel = param.displayName ?? smartHumanize(param.argName);
  const curArg =
    param.argName in argsMap ? argsMap[param.argName][0] : undefined;
  const curExpr = curArg?.expr;
  const controlExtras = mkControlExtras([param.argName]);

  return [
    {
      collapsible: !!isAdvancedProp(propType, undefined),
      content: (
        <ServerQueryParamRow
          attr={param.argName}
          propType={propType}
          expr={curExpr}
          label={argLabel}
          valueSetState={curExpr ? "isSet" : undefined}
          propValueEditorContext={propValueEditorContext}
          controlExtras={controlExtras}
          onChange={(expr) => {
            if (expr == null) {
              return;
            }
            const newExpr = isKnownExpr(expr) ? expr : codeLit(expr);
            onParamChange(param, newExpr);
          }}
          onDelete={curExpr ? () => onParamDelete(param) : undefined}
        />
      ),
    },
  ];
}
