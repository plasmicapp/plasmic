export type Fiber =
  | FiberForComponentClass
  | FiberForFunctionComponent
  | FiberForInstrinsicElement
  | FiberForTextNode
  | FiberForOtherNodes;

interface FiberBase {
  tag: WorkTag;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  alternate: Fiber | null;
  key: null | string;
  ref: React.Ref<any>;
  pendingProps: any;
  memoizedProps: any;
  memoizedState: any;
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

type WorkTag =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24;

export const FunctionComponent = 0;
export const ClassComponent = 1;
export const IndeterminateComponent = 2; // Before we know whether it is function or class
export const HostRoot = 3; // Root of a host tree. Could be nested inside another node.
export const HostPortal = 4; // A subtree. Could be an entry point to a different renderer.
export const HostComponent = 5;
export const HostText = 6;
export const Fragment = 7;
export const Mode = 8;
export const ContextConsumer = 9;
export const ContextProvider = 10;
export const ForwardRef = 11;
export const Profiler = 12;
export const SuspenseComponent = 13;
export const MemoComponent = 14;
export const SimpleMemoComponent = 15;
export const LazyComponent = 16;
export const IncompleteClassComponent = 17;
export const DehydratedFragment = 18;
export const SuspenseListComponent = 19;
export const ScopeComponent = 21;
export const OffscreenComponent = 22;
export const LegacyHiddenComponent = 23;
export const CacheComponent = 24;
