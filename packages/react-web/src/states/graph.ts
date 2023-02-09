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
  private _specs: Internal$StateSpec<T>[];
  private _edges: Map<string | symbol, StateSpecNode<any>>;
  private _state: Record<string, StateCell<T>>;

  constructor(specs: Internal$StateSpec<T>[]) {
    this._specs = specs;
    this._edges = new Map();
    this._state = {};
  }

  setSpecs(specs: Internal$StateSpec<T>[]) {
    this._specs = specs;
  }

  edges() {
    return this._edges;
  }

  state() {
    return this._state;
  }

  hasEdge(key: string | symbol) {
    return this._edges.has(key);
  }

  addEdge(key: string | symbol, node: StateSpecNode<any>) {
    this._edges.set(key, node);
  }

  clearEdges() {
    this._edges = new Map();
  }

  children() {
    return this._edges.values();
  }

  makeTransition(key: string | symbol | number) {
    key = isNum(key) ? ARRAY_SYMBOL : key;
    return this._edges.get(key);
  }

  isLeaf() {
    return this._edges.size === 0;
  }

  hasArrayTransition() {
    return this._edges.has(ARRAY_SYMBOL);
  }

  getSpec() {
    return this._specs[0];
  }

  getAllSpecs() {
    return this._specs;
  }

  getState(path: ObjectPath) {
    return this._state[JSON.stringify(path)];
  }

  getInitFunc(stateCell: StateCell<any>) {
    return stateCell.registeredInitFunc ?? this.getSpec().initFunc;
  }

  clearStates() {
    this._state = {};
  }

  states() {
    return Object.values(this._state);
  }

  hasState(path: ObjectPath) {
    const key = JSON.stringify(path);
    return key in this._state;
  }

  createStateCell(path: ObjectPath) {
    const key = JSON.stringify(path);
    this._state[key] = {
      listeners: [],
      initialValue: UNINITIALIZED,
      path,
    };
  }

  deleteStateCell(prefixPath: ObjectPath) {
    [...Object.keys(this._state)].forEach((key) => {
      const path = JSON.parse(key);
      if (shallowEqual(prefixPath, path.slice(0, prefixPath.length))) {
        delete this._state[key];
      }
    });
  }

  setInitialValue(path: ObjectPath, value: any) {
    const key = JSON.stringify(path);
    this._state[key].initialValue = value;
  }

  getInitialValue(path: ObjectPath) {
    const key = JSON.stringify(path);
    return this._state[key].initialValue;
  }

  addListener(path: ObjectPath, f: () => void) {
    const key = JSON.stringify(path);
    this._state[key].listeners.push(f);
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

export function updateTree(root: StateSpecNode<any>, specs: $StateSpec<any>[]) {
  const internalSpec = specs.map(
    (spec) =>
      ({
        ...spec,
        pathObj: transformPathStringToObj(spec.path),
        isRepeated: spec.path.split(".").some((part) => part.endsWith("[]")),
      } as Internal$StateSpec<any>)
  );

  const rec = (
    oldNode: StateSpecNode<any> | undefined,
    currentPath: (string | symbol)[]
  ): StateSpecNode<any> => {
    const nodeSpecs = internalSpec.filter((spec) =>
      shallowEqual(currentPath, spec.pathObj.slice(0, currentPath.length))
    )!;
    const node = oldNode ?? new StateSpecNode(nodeSpecs);
    node.setSpecs(nodeSpecs);
    const oldEdges = oldNode?.edges();
    node.clearEdges();
    node.getAllSpecs().forEach((spec) => {
      if (spec.pathObj.length > currentPath.length) {
        const nextKey = spec.pathObj[currentPath.length];
        if (!node.hasEdge(nextKey)) {
          node.addEdge(
            nextKey,
            rec(oldEdges?.get(nextKey), [...currentPath, nextKey])
          );
        }
      }
    });
    return node;
  };

  return rec(root, []);
}

export function getStateCells(root: StateSpecNode<any>) {
  const leaves: StateSpecNode<any>[] = [];
  const rec = (node: StateSpecNode<any>) => {
    for (const child of node.children()) {
      rec(child);
    }
    if (node.isLeaf() && node.getAllSpecs().length > 0) {
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
