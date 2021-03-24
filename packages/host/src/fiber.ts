export type Fiber =
  | FiberForComponentClass
  | FiberForFunctionComponent
  | FiberForInstrinsicElement
  | FiberForTextNode
  | FiberForOtherNodes;

interface FiberBase {
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  key: null | string;
  ref: React.Ref<any>;
  pendingProps: any;
  memoizedProps: any;
}

export interface FiberForFunctionComponent extends FiberBase {
  elementType: React.FunctionComponent;
  type: React.FunctionComponent;

  stateNode: null;
}

export interface FiberForComponentClass extends FiberBase {
  elementType: React.ComponentClass;
  type: React.ComponentClass;

  stateNode: React.Component;
}

export interface FiberForInstrinsicElement extends FiberBase {
  elementType: keyof JSX.IntrinsicElements;
  type: keyof JSX.IntrinsicElements;

  stateNode: HTMLElement;
}

export interface FiberForTextNode extends FiberBase {
  elementType: null;
  type: null;

  stateNode: Text;
}

export interface FiberForOtherNodes extends FiberBase {
  elementType: any;
  type: any;

  stateNode: null;
}
