import { StateSpecNode } from "./graph";

export type InitFuncEnv = {
  $props: Record<string, any>;
  $state: Record<string, any>;
  $queries?: Record<string, any>;
  $ctx?: Record<string, any>;
  $refs?: Record<string, any>;
};

export type DollarStateEnv = Omit<InitFuncEnv, "$state">;

export type NoUndefinedField<T> = { [P in keyof T]-?: T[P] };

export type InitFunc<T> = (env: NoUndefinedField<InitFuncEnv>) => T;

export type DeprecatedInitFunc<T> = (
  $props: Record<string, any>,
  $state: $State,
  $ctx: Record<string, any>
) => T;

export type ObjectPath = (string | number)[];

export interface $StateSpec<T> {
  // path of the state, like `count` or `list.selectedIndex`
  path: string;
  // if initial value is defined by a js expression
  initFunc?: InitFunc<T>;
  // if initial value is a hard-coded value
  initVal?: T;
  // Whether this state is private, readonly, or writable in
  // this component
  type: "private" | "readonly" | "writable";

  // If writable, there should be a valueProp that maps props[valueProp]
  // to the value of the state
  valueProp?: string;

  // If writable or readonly, there should be an onChangeProp where
  // props[onChangeProp] is invoked whenever the value changes
  onChangeProp?: string;

  isImmutable?: boolean;

  variableType:
    | "text"
    | "number"
    | "boolean"
    | "array"
    | "object"
    | "variant"
    | "dateString"
    | "dateRangeStrings";

  // Hash used to re-create the state
  // This is only used in canvas where the state specs are dynamic
  initFuncHash?: string;

  refName?: string;
  onMutate?: (stateValue: T, $ref: any) => void;
}

export interface $State {
  [key: string]: any;
  registerInitFunc?: (
    path: string,
    f: InitFunc<any>,
    repetitonIndex?: number[],
    overrideEnv?: DollarStateEnv
  ) => any;
}

export const ARRAY_SYMBOL = Symbol("[]");
export const PLASMIC_STATE_PROXY_SYMBOL = Symbol("plasmic.state.proxy");
export const UNINITIALIZED = Symbol("plasmic.unitialized");

export interface Internal$StateSpec<T> extends $StateSpec<T> {
  isRepeated: boolean;
  pathObj: (string | symbol)[];
}

export interface Internal$StateInstance {
  path: ObjectPath; // ["counter", 0, "count"]
  specKey: string;
}

export interface StateCell<T> {
  initialValue?: T | symbol;
  node: StateSpecNode<any>;
  path: ObjectPath;
  initFunc?: InitFunc<T>;
  listeners: (() => void)[];
  initFuncHash: string;
  overrideEnv?: NoUndefinedField<DollarStateEnv>;
}

export interface Internal$State {
  registrationsQueue: {
    node: StateSpecNode<any>;
    path: ObjectPath;
    f: InitFunc<any>;
    overrideEnv?: NoUndefinedField<DollarStateEnv>;
  }[];
  stateValues: Record<string, any>;
  env: NoUndefinedField<DollarStateEnv>;
  rootSpecTree: StateSpecNode<any>;
  specTreeLeaves: StateSpecNode<any>[];
  specs: $StateSpec<any>[];
  stateInitializationEnv: {
    stack: string[];
    visited: Set<string>;
  };
  initializedLeafPaths: Set<string>;
}
