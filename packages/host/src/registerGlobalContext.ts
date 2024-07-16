import {
  BooleanType,
  ChoiceType,
  CustomType,
  DataSourceType,
  JSONLikeType,
  NumberType,
  StringType,
} from "./prop-types";
import { FunctionParam } from "./registerComponent";

const root = globalThis as any;

// Using just a subset of types from prop-types
export type PropType<P> =
  | StringType<P>
  | BooleanType<P>
  | NumberType<P>
  | JSONLikeType<P>
  | ChoiceType<P>
  | DataSourceType<P>
  | CustomType<P>;

type RestrictPropType<T, P> = T extends string
  ? StringType<P> | ChoiceType<P> | JSONLikeType<P> | CustomType<P>
  : T extends boolean
  ? BooleanType<P> | JSONLikeType<P> | CustomType<P>
  : T extends number
  ? NumberType<P> | JSONLikeType<P> | CustomType<P>
  : PropType<P>;

type DistributedKeyOf<T> = T extends any ? keyof T : never;

export interface GlobalContextMeta<P> {
  /**
   * Any unique string name used to identify that context. Each context
   * should be registered with a different `meta.name`, even if they have the
   * same name in the code.
   */
  name: string;
  /**
   * The name to be displayed for the context in Studio. Optional: if not
   * specified, `meta.name` is used.
   */
  displayName?: string;
  /**
   * The description of the context to be shown in Studio.
   */
  description?: string;
  /**
   * The javascript name to be used when generating code. Optional: if not
   * provided, `meta.name` is used.
   */
  importName?: string;
  /**
   * An object describing the context properties to be used in Studio.
   * For each `prop`, there should be an entry `meta.props[prop]` describing
   * its type.
   */
  props: { [prop in DistributedKeyOf<P>]?: RestrictPropType<P[prop], P> } & {
    [prop: string]: PropType<P>;
  };
  /**
   * The path to be used when importing the context in the generated code.
   * It can be the name of the package that contains the context, or the path
   * to the file in the project (relative to the root directory).
   */
  importPath: string;
  /**
   *  Whether the context is the default export from that path. Optional: if
   * not specified, it's considered `false`.
   */
  isDefaultExport?: boolean;
  /**
   * The prop that receives and forwards a React `ref`. Plasmic only uses `ref`
   * to interact with components, so it's not used in the generated code.
   * Optional: If not provided, the usual `ref` is used.
   */
  refProp?: string;
  /**
   * Whether the global context provides data to its children using DataProvider.
   */
  providesData?: boolean;

  globalActions?: Record<string, GlobalActionRegistration<P>>;
}

export interface GlobalContextRegistration {
  component: React.ComponentType<any>;
  meta: GlobalContextMeta<any>;
}

export interface GlobalActionRegistration<P> {
  displayName?: string;
  description?: string;
  parameters: FunctionParam<P>[];
}

declare global {
  interface Window {
    __PlasmicContextRegistry: GlobalContextRegistration[];
  }
}

if (root.__PlasmicContextRegistry == null) {
  root.__PlasmicContextRegistry = [];
}

export default function registerGlobalContext<
  T extends React.ComponentType<any>
>(component: T, meta: GlobalContextMeta<React.ComponentProps<T>>) {
  // Check for duplicates
  if (
    root.__PlasmicContextRegistry.some(
      (r: GlobalContextRegistration) =>
        r.component === component && r.meta.name === meta.name
    )
  ) {
    return;
  }
  root.__PlasmicContextRegistry.push({ component, meta });
}
