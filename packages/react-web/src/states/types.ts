export type InitFunc<T> = (
  $props: Record<string, any>,
  $state: $State,
  $ctx: Record<string, any>,
  indexes?: number[]
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
}

export interface $State {
  [key: string]: any;
  registerInitFunc?: (
    path: string,
    f: InitFunc<any>,
    repetitonIndex?: number[]
  ) => any;
}

export const ARRAY_SYMBOL = Symbol("[]");
export const PLASMIC_STATE_PROXY_SYMBOL = Symbol("plasmic.state.proxy");

export interface Internal$StateSpec<T> extends $StateSpec<T> {
  isRepeated: boolean;
  pathObj: (string | symbol)[];
}

export interface Internal$StateInstance {
  path: ObjectPath; // ["counter", 0, "count"]
  specKey: string;
}
