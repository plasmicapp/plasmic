import { $StateSpec, ARRAY_SYMBOL, Internal$StateSpec } from ".";
import { isNum, shallowEqual } from "./helpers";

export class StateSpecNode<T> {
  private specs: Internal$StateSpec<T>[];
  private edges: Map<string | symbol, StateSpecNode<any>>;

  constructor(specs: Internal$StateSpec<T>[]) {
    this.specs = specs;
    this.edges = new Map();
  }

  hasEdge(key: string | symbol) {
    return this.edges.has(key);
  }

  addEdge(key: string | symbol, node: StateSpecNode<any>) {
    this.edges.set(key, node);
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
}

export const transformPathStringToObj = (str: string) => {
  const splitStatePathPart = (state: string): (string | symbol)[] =>
    state.endsWith("[]")
      ? [...splitStatePathPart(state.slice(0, -2)), ARRAY_SYMBOL]
      : [state];
  return str.split(".").flatMap(splitStatePathPart);
};

export function buildGraph(specs: $StateSpec<any>[]) {
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
