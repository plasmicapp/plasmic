const root = globalThis as any;

/**
 * Context that we pass back to control functions.
 */
export type ControlContext<P> = [
  /**
   * props
   */
  P
];

/**
 * Config option that takes the context (e.g., props) of the function call
 * to dynamically set its value.
 */
export type ContextDependentConfig<P, R> = (...args: ControlContext<P>) => R;

export interface BaseParam {
  name: string;
  description?: string;
  isOptional?: boolean;
  isRestParameter?: boolean;
}

export interface ChoiceTypeBase<P, T> extends BaseParam {
  type: "choice";
  options:
    | T[]
    | {
        label: string;
        value: T;
      }[]
    | ContextDependentConfig<
        P,
        | T[]
        | {
            label: string;
            value: T;
          }[]
      >;
  allowSearch?: boolean;
  filterOption?: boolean;
  onSearch?: ContextDependentConfig<P, ((value: string) => void) | undefined>;
}

export interface SingleChoiceType<P, T> extends ChoiceTypeBase<P, T> {
  multiSelect?: false;
}

export interface MultiChoiceType<P, T> extends ChoiceTypeBase<P, T[]> {
  multiSelect: true;
}

export interface CustomChoiceType<P, T> extends ChoiceTypeBase<P, T | T[]> {
  multiSelect: ContextDependentConfig<P, boolean>;
}

export type ChoiceType<P, T> =
  | SingleChoiceType<P, T>
  | MultiChoiceType<P, T>
  | CustomChoiceType<P, T>;

export interface PlainStringType<T extends string = string> extends BaseParam {
  type: "string" | `'${T}'`;
}

export type StringType<P, T extends string = string> =
  | "string"
  | PlainStringType<T>
  | ChoiceType<P, T>
  | AnyType;

export interface PlainNumberType<T extends number = number> extends BaseParam {
  type: "number" | `${number extends T ? number : T}`;
}

export type NumberType<P, T extends number = number> =
  | PlainNumberType<T>
  | ChoiceType<P, T>
  | AnyType;

export interface PlainBooleanType<T extends boolean = boolean>
  extends BaseParam {
  type: "boolean" | `${boolean extends T ? boolean : T}`;
}

export type BooleanType<P, T extends boolean = boolean> =
  | PlainBooleanType<T>
  | ChoiceType<P, T>
  | AnyType;

export type GraphQLValue = {
  query: string;
  variables?: Record<string, any>;
};

export interface GraphQLType<P> extends BaseParam {
  type: "code";
  lang: "graphql";
  endpoint: string | ContextDependentConfig<P, string>;
  method?: string | ContextDependentConfig<P, string>;
  headers?: object | ContextDependentConfig<P, object>;
}

export interface PlainNullType extends BaseParam {
  type: "null";
}
export type NullType = PlainNullType | AnyType;

export interface PlainUndefinedType extends BaseParam {
  type: "undefined";
}
export type UndefinedType = PlainUndefinedType | AnyType;

export interface PlainArrayType extends BaseParam {
  type: "array";
}
export type ArrayType = PlainArrayType | AnyType;

export interface PlainObjectType extends BaseParam {
  type: "object";
}
export type ObjectType = PlainObjectType | AnyType;

export interface PlainAnyType extends BaseParam {
  type: "any";
}
export type AnyType = PlainAnyType;

export interface PlainVoidType extends BaseParam {
  type: "void";
}
export type VoidType = PlainVoidType | AnyType;

type IsAny<T> = 0 extends 1 & T ? true : false;

type CommonType<T> = T extends GraphQLValue
  ? GraphQLType<T>
  : T extends null
  ? NullType
  : T extends undefined
  ? UndefinedType
  : T extends Array<any>
  ? ArrayType
  : T extends object
  ? ObjectType
  : AnyType;

type AnyTyping<P, T> = T extends string
  ? StringType<P, T>
  : T extends number
  ? NumberType<P, T>
  : T extends boolean
  ? BooleanType<P, T>
  : CommonType<T>;

export type RestrictedType<P, T> = IsAny<T> extends true
  ? AnyTyping<P, T>
  : [T] extends [string]
  ? StringType<P, T>
  : [T] extends [number]
  ? NumberType<P, T>
  : [T] extends [boolean]
  ? BooleanType<P, T>
  : CommonType<T>;

export type ParamType<P, T> = RestrictedType<P, T>;

export type RequiredParam<P, T> = ParamType<P, T> & {
  isOptional?: false;
  isRestParameter?: false;
};

export type OptionalParam<P, T> = ParamType<P, T> & {
  isRestParameter?: false;
};

export type RestParam<P, T> = ParamType<P, T> & {
  isOptional?: false;
  isRestParameter: true;
};

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

type HandleRequiredParams<P, R extends any[]> = R extends [infer H, ...infer T]
  ? [string | RequiredParam<P, H>, ...HandleRequiredParams<P, T>]
  : [];

type HandleOptionalParams<P, R extends any[]> = R extends [infer H, ...infer T]
  ?
      | []
      | [
          string | OptionalParam<P, H | undefined>,
          ...HandleOptionalParams<P, T>
        ]
  : R extends []
  ? []
  : R extends Array<infer T>
  ? [] | [RestParam<P, T[]>]
  : [];

export type HandleParams<P extends any[]> = [
  ...HandleRequiredParams<P, RequiredParams<P>>,
  ...HandleOptionalParams<P, Required<OptionalParams<P>>>
];

export type HandleReturnType<P, T> = VoidType | ParamType<P, T>;

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
   * A display name for the function. It will be shown only in studio.
   */
  displayName?: string;
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
    type?: HandleReturnType<Parameters<F>, ReturnType<F>>;
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
