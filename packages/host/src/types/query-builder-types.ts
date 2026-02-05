import { ContextDependentConfig } from "./shared-controls";

/**
 * Control type for building a custom query format.
 *
 * This control is based on react-awesome-query-builder
 * and returns data in JsonLogic format.
 *
 * If using this control type, it's recommended to install
 * @react-awesome-query-builder/core and json-logic-js as devDependencies
 * so that you can reference their types.
 *
 * References:
 * - https://github.com/ukrbublik/react-awesome-query-builder
 * - https://github.com/jwadhams/json-logic-js
 * - https://jsonlogic.com/
 */
export interface QueryBuilderCore<Ctx extends any[]> {
  type: "queryBuilder";

  /**
   * Return a @react-awesome-query-builder/core `Config` that will be merged
   * with Plasmic's built-in config.
   *
   * https://github.com/plasmicapp/plasmic/blob/master/platform/wab/src/wab/client/components/QueryBuilder/QueryBuilderConfig.tsx
   *
   * At a minimum, this should return fields and their types.
   * For configuration options, see react-awesome-query-builder docs.
   */
  config: ContextDependentConfig<Ctx, SimplifiedConfig>;
}

/**
 * A simplified subset of @react-awesome-query-builder/core `Config`.
 */
interface SimplifiedConfig {
  fields: SimplifiedFields;
}

/**
 * A simplified subset of @react-awesome-query-builder/core `Fields`.
 */
interface SimplifiedFields {
  [key: string]: SimplifiedField;
}

/**
 * A simplified subset of @react-awesome-query-builder/core `FieldOrGroup`.
 */
interface SimplifiedField {
  type:
    | "text"
    | "number"
    | "boolean"
    | "date"
    | "time"
    | "datetime"
    | "select"
    | "multiselect"
    | "treeselect"
    | "treemultiselect"
    | string;
  label?: string;
  defaultValue?: unknown;
  operators?: readonly string[];
  fieldSettings?: {};
}
