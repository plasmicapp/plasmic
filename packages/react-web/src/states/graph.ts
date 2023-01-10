import { isNum, shallowEqual } from "./helpers";
import {
  $StateSpec,
  ARRAY_SYMBOL,
  InitFunc,
  Internal$StateSpec,
  ObjectPath,
} from "./types";

const UNINITIALIZED = Symbol("plasmic.unitialized");

export interface StateCell<T> {
  initialValue?: T | Symbol;
  path: ObjectPath;
  registeredInitFunc?: InitFunc<T>;
  listeners: (() => void)[];
}

export class StateSpecNode<T> {
  private specs: Internal$StateSpec<T>[];
  private edges: Map<string | symbol, StateSpecNode<any>>;
  private state: Record<string, StateCell<T>>;

  constructor(specs: Internal$StateSpec<T>[]) {
    this.specs = specs;
    this.edges = new Map();
    this.state = {};
  }

  hasEdge(key: string | symbol) {
    return this.edges.has(key);
  }

  addEdge(key: string | symbol, node: StateSpecNode<any>) {
    this.edges.set(key, node);
  }

  children() {
    return this.edges.values();
  }

  makeTransition(key: string | symbol | number) {
    key = isNum(key) ? ARRAY_SYMBOL : key;
    return this.edges.get(key);
  }

  isLeaf() {
    return this.edges.size === 0;
  }

  hasArrayTransition() {
    return this.edges.has(ARRAY_SYMBOL);
  }

  getSpec() {
    return this.specs[0];
  }

  getAllSpecs() {
    return this.specs;
  }

  getState(path: ObjectPath) {
    return this.state[JSON.stringify(path)];
  }

  clearStates() {
    this.state = {};
  }

  states() {
    return Object.values(this.state);
  }

  hasState(path: ObjectPath) {
    const key = JSON.stringify(path);
    return key in this.state;
  }

  createStateCell(path: ObjectPath) {
    const key = JSON.stringify(path);
    this.state[key] = {
      listeners: [],
      initialValue: UNINITIALIZED,
      registeredInitFunc: this.getSpec().initFunc,
      path,
    };
  }

  setInitialValue(path: ObjectPath, value: any) {
    const key = JSON.stringify(path);
    this.state[key].initialValue = value;
  }

  getInitialValue(path: ObjectPath) {
    const key = JSON.stringify(path);
    return this.state[key].initialValue;
  }

  addListener(path: ObjectPath, f: () => void) {
    const key = JSON.stringify(path);
    this.state[key].listeners.push(f);
  }
}

export const transformPathStringToObj = (str: string) => {
  const splitStatePathPart = (state: string): (string | symbol)[] =>
    state.endsWith("[]")
      ? [...splitStatePathPart(state.slice(0, -2)), ARRAY_SYMBOL]
      : [state];
  return str.split(".").flatMap(splitStatePathPart);
};

export function buildTree(specs: $StateSpec<any>[]) {
  const internalSpec = specs.map(
    (spec) =>
      ({
        ...spec,
        pathObj: transformPathStringToObj(spec.path),
        isRepeated: spec.path.split(".").some((part) => part.endsWith("[]")),
      } as Internal$StateSpec<any>)
  );

  const rec = (currentPath: (string | symbol)[]): StateSpecNode<any> => {
    const node = new StateSpecNode(
      internalSpec.filter((spec) =>
        shallowEqual(currentPath, spec.pathObj.slice(0, currentPath.length))
      )!
    );
    node.getAllSpecs().forEach((spec) => {
      if (spec.pathObj.length > currentPath.length) {
        const nextKey = spec.pathObj[currentPath.length];
        if (!node.hasEdge(nextKey)) {
          node.addEdge(nextKey, rec([...currentPath, nextKey]));
        }
      }
    });
    return node;
  };

  return rec([]);
}

export function getLeaves(root: StateSpecNode<any>) {
  const leaves: StateSpecNode<any>[] = [];
  const rec = (node: StateSpecNode<any>) => {
    for (const child of node.children()) {
      rec(child);
    }
    if (node.isLeaf()) {
      leaves.push(node);
    }
  };
  rec(root);
  return leaves;
}

export function findStateCell(
  root: StateSpecNode<any>,
  pathStr: string,
  repetitionIndex?: number[]
) {
  const realPath: ObjectPath = [];
  const pathObj = transformPathStringToObj(pathStr);
  let currRepIndex = 0;
  for (const part of pathObj) {
    if (typeof part === "symbol") {
      if (
        !root.hasArrayTransition() ||
        !repetitionIndex ||
        currRepIndex > repetitionIndex.length
      ) {
        console.log(root);
        throw new Error(
          `transition not found: pathStr ${pathStr} part ${
            typeof part === "symbol" ? "[]" : part
          }`
        );
      }
      realPath.push(repetitionIndex[currRepIndex++]);
      root = root.makeTransition(ARRAY_SYMBOL)!;
    } else {
      if (!root.hasEdge(part)) {
        throw new Error(
          `transition not found: pathStr ${pathStr} part ${
            typeof part === "symbol" ? "[]" : part
          }`
        );
      }
      realPath.push(part);
      root = root.makeTransition(part)!;
    }
  }
  return {
    node: root,
    realPath,
  };
}
