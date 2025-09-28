import { ContextDependentConfig } from "./shared-controls";

export interface RichExprEditorCore<Ctx extends any[]> {
  type: "exprEditor";
  data?: Record<string, any> | ContextDependentConfig<Ctx, Record<string, any>>;
  isolateEnv?: boolean;
}

export interface DataSourceCore {
  type: "dataSource";
  dataSource: "airtable" | "cms";
}

export type DataPickerValueType = string | number | (string | number)[];
export interface RichDataPickerCore<Ctx extends any[]> {
  type: "dataSelector";
  data?: Record<string, any> | ContextDependentConfig<Ctx, Record<string, any>>;
  alwaysShowValuePathAsLabel?: boolean;
  isolateEnv?: boolean;
}

export type GraphQLValue = {
  query: string;
  variables?: Record<string, any>;
};

export interface GraphQLCore<Ctx extends any[]> {
  type: "code";
  lang: "graphql";
  endpoint: string | ContextDependentConfig<Ctx, string>;
  method?: string | ContextDependentConfig<Ctx, string>;
  headers?: object | ContextDependentConfig<Ctx, object>;
}

/**
 * Dynamic prop/param type that returns different control types based on context
 */
export interface DynamicCore<Ctx extends any[], ControlType> {
  type: "dynamic";
  /**
   * Function that takes the context and returns a control type
   */
  control: ContextDependentConfig<Ctx, ControlType>;
}
