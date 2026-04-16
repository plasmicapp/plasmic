import { ServerQueryWithOperation } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { Component, Site } from "@/wab/shared/model/classes";

/**
 * A string with JavaScript code to be evaluated at runtime.
 * It may reference dynamic values like $props, $ctx, $queries, etc.
 */
export type DynamicExprCode = string;

/**
 * Corresponds to <DataProvider name="..." data={...}> or code components
 * that provide data context via serverRendering registration.
 */
export interface ServerDataProviderContextNode {
  type: "dataProvider";
  // The name of this data in $ctx
  name: string;
  // Expression code that evaluates to the data value
  data: DynamicExprCode;
  children: ServerNode[];
}

/**
 * Visibility condition that controls whether children are rendered.
 * Corresponds to dataCond expressions on variant settings.
 */
export interface ServerVisibilityContextNode {
  type: "visibility";
  // Code that evaluates to a boolean determining visibility
  visibilityExpr: DynamicExprCode;
  children: ServerNode[];
}

/**
 * A repeated element context (dataRep).
 */
export interface ServerRepeatedContextNode {
  type: "repeated";
  // Code that evaluates to the collection to iterate over
  collectionExpr: DynamicExprCode;
  // Variable for the current item (available in children exprs)
  itemName: string;
  // Variable for the current index (available in children exprs)
  indexName: string;
  children: ServerNode[];
}

/**
 * Represents a Plasmic component instance in the server render tree.
 * This includes both the component's own server queries and how props flow to it.
 */
export interface ServerComponentNode {
  type: "component";
  component: Component;
  // Server queries from this component, to be executed
  queries: ServerQueryWithOperation[];
  // Maps prop name to expression code. May reference $props, $ctx, $queries from parent.
  propsContext: Record<string, DynamicExprCode>;
  children: ServerNode[];
}

/**
 * Code component that may have special server rendering behavior. Register with
 * serverRendering: boolean to control whether they should be server rendered.
 */
export interface ServerCodeComponentNode {
  type: "codeComponent";
  component: Component;
  propsContext: Record<string, DynamicExprCode>;
  /** Whether the code component should be server rendered. */
  serverRenderingConfig?: ServerRenderingConfig;
  children: ServerNode[];
}

// Configures how a code component behaves during server rendering.
export type ServerRenderingConfig = boolean;

/**
 * Union type of all possible server node types
 */
export type ServerNode =
  | ServerComponentNode
  | ServerCodeComponentNode
  | ServerRepeatedContextNode
  | ServerDataProviderContextNode
  | ServerVisibilityContextNode;

/**
 * The root of a server query collection tree.
 * Contains the entry component and all discovered server nodes.
 */
export interface ServerQueryTree {
  rootComponent: Component;
  rootNode: ServerComponentNode;
}

/**
 * Context passed during server query collection traversal.
 * Tracks the current evaluation environment.
 */
export interface ServerQueryCollectionContext {
  site: Site;
  componentMap: Map<string, Component>;
  // Code component registrations with serverRendering configs
  codeComponentMeta: Map<Component, CodeComponentServerMeta>;
}

/**
 * Metadata about a code component's server rendering behavior
 */
export interface CodeComponentServerMeta {
  // Whether the component should be server rendered
  serverRendering?: ServerRenderingConfig;
}
