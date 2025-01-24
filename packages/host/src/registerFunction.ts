const root = globalThis as any;

export type StringType<T extends string = string> = "string" | `'${T}'`;

export type NumberType<T extends number = number> =
  | "number"
  | `${number extends T ? number : T}`;

export type BooleanType<T extends boolean = boolean> =
  | "boolean"
  | `${boolean extends T ? boolean : T}`;

export type NullType = "null";

export type UndefinedType = "undefined";

export type ArrayType = "array";

export type ObjectType = "object";

export type AnyType = "any";

export type VoidType = "void";

export type RestrictedType<T> = T extends string
  ? StringType<T>
  : T extends number
  ? NumberType<T>
  : T extends boolean
  ? BooleanType<T>
  : T extends null
  ? NullType
  : T extends undefined
  ? UndefinedType
  : T extends Array<any>
  ? ArrayType
  : T extends object
  ? ObjectType
  : AnyType;

export type OrType<T> = RestrictedType<T>[];

export type ParamType<T> = AnyType | RestrictedType<T> | OrType<T>;

export interface BaseParam<T> {
  name: string;
  type?: ParamType<T>;
  description?: string;
  isOptional?: boolean;
  isRestParam?: boolean;
}

// Param name and optionally param type
export interface RequiredParam<T> extends BaseParam<T> {
  isOptional?: false;
  isRestParameter?: false;
}

export interface OptionalParam<T> extends BaseParam<T | undefined> {
  isRestParameter?: false;
}

export interface RestParam<T> extends BaseParam<T> {
  isOptional?: false;
  isRestParameter: true;
}

// https://stackoverflow.com/questions/70684030/remove-all-optional-items-from-a-tuple-type
type RequiredParams<
  T extends any[],
  U extends any[] = []
> = Partial<T> extends T
  ? U
  : T extends [infer F, ...infer R]
  ? RequiredParams<R, [...U, F]>
  : U;

type OptionalParams<T extends any[]> = T extends [
  ...RequiredParams<T>,
  ...infer R
]
  ? [...R]
  : [];

type HandleRequiredParams<P extends any[]> = P extends [infer H, ...infer T]
  ? [string | RequiredParam<H>, ...HandleRequiredParams<T>]
  : [];

type HandleOptionalParams<P extends any[]> = P extends [infer H, ...infer T]
  ? [] | [string | OptionalParam<H | undefined>, ...HandleOptionalParams<T>]
  : P extends []
  ? []
  : P extends Array<infer T>
  ? [] | [RestParam<T[]>]
  : [];

export type HandleParams<P extends any[]> = [
  ...HandleRequiredParams<RequiredParams<P>>,
  ...HandleOptionalParams<Required<OptionalParams<P>>>
];

export type HandleReturnType<T> = VoidType | ParamType<T>;

export interface CustomFunctionMeta<F extends (...args: any[]) => any> {
  /**
   * The javascript name of the function. Notice it must be unique across all
   * other functions and function namespaces. If two functions have the same
   * name, they should be registered with different `meta.namespace`.
   */
  name: string;
  /**
   * A namespace for organizing groups of functions. It's also used to handle
   * function name collisions. If a function has a namespace, it will be used
   * whenever accessing the function.
   */
  namespace?: string;
  /**
   * Documentation for the registered function.
   */
  description?: string;
  /**
   * An array containing the list of parameters names the function takes.
   * Optionally they can also be registered with the expected param types.
   */
  params?: HandleParams<Parameters<F>>;
  /**
   * Return value information.
   */
  returnValue?: {
    /**
     * The function return type.
     */
    type?: HandleReturnType<ReturnType<F>>;
    /**
     * The function return value description.
     */
    description?: string;
  };
  /**
   * Typescript function declaration. If specified, it ignores the types
   * provided by `params` and `returnValue`.
   */
  typescriptDeclaration?: string;

  /**
   * Whether this function can be used as a query in the editor.
   */
  isQuery?: boolean;
  /**
   * The path to be used when importing the function in the generated code.
   * It can be the name of the package that contains the function, or the path
   * to the file in the project (relative to the root directory).
   */
  importPath: string;
  /**
   * Whether the function is the default export from that path. Optional: if
   * not specified, it's considered `false`.
   */
  isDefaultExport?: boolean;
}

export interface CustomFunctionRegistration {
  function: (...args: any[]) => any;
  meta: CustomFunctionMeta<any>;
}

declare global {
  interface Window {
    __PlasmicFunctionsRegistry: CustomFunctionRegistration[];
  }
}

if (root.__PlasmicFunctionsRegistry == null) {
  root.__PlasmicFunctionsRegistry = [];
}

export default function registerFunction<F extends (...args: any[]) => any>(
  fn: F,
  meta: CustomFunctionMeta<F>
) {
  // Check for duplicates
  if (
    root.__PlasmicFunctionsRegistry.some(
      (r: CustomFunctionRegistration) =>
        r.function === fn &&
        r.meta.name === meta.name &&
        r.meta.namespace == meta.namespace
    )
  ) {
    return;
  }
  root.__PlasmicFunctionsRegistry.push({ function: fn, meta });
}
