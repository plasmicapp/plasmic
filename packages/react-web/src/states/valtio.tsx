import clone from "clone";
import get from "dlv";
import deepEqual from "fast-deep-equal";
import React from "react";
import { proxy as createValtioProxy, ref, useSnapshot } from "valtio";
import {
  buildTree,
  findStateCell,
  getLeaves,
  StateCell,
  StateSpecNode,
} from "./graph";
import { assert, set, useIsomorphicLayoutEffect } from "./helpers";
import { $State, $StateSpec, InitFunc, ObjectPath } from "./types";

function isNum(value: string | number | symbol): value is number {
  return typeof value === "symbol" ? false : !isNaN(+value);
}

function canProxy(value: any) {
  return typeof value === "object" && value != null;
}

interface Internal$State {
  registrationsQueue: {
    node: StateSpecNode<any>;
    path: ObjectPath;
    f: InitFunc<any>;
  }[];
  stateValues: Record<string, any>;
  props: Record<string, any>;
  ctx: Record<string, any>;
  rootSpecTree: StateSpecNode<any>;
  specTreeLeaves: StateSpecNode<any>[];
}

function initializeStateValue(
  $$state: Internal$State,
  initialSpecNode: StateSpecNode<any>,
  initialStatePath: ObjectPath,
  proxyRoot: any
) {
  const stateAccess: Set<{
    node: StateSpecNode<any>;
    path: ObjectPath;
  }> = new Set();
  const $state = create$StateProxy($$state, (node, path) => ({
    get() {
      stateAccess.add({ path, node });
      const spec = node.getSpec();
      if (spec.valueProp) {
        return $$state.props[spec.valueProp];
      } else if (!node.hasState(path) && spec.initFunc) {
        return initializeStateValue($$state, node, path, proxyRoot);
      }
      return get(proxyRoot, path);
    },
    set() {
      throw new Error(`Cannot update state values during initialization`);
    },
  }));

  stateAccess.forEach(({ node, path }) => {
    node.addListener(path, () => {
      const newValue = initialSpecNode.getSpec().initFunc!(
        $$state.props,
        $state,
        $$state.ctx
      );
      set(proxyRoot, initialStatePath, newValue);
    });
  });

  const initialValue = initialSpecNode.getState(initialStatePath)
    .registeredInitFunc!($$state.props, $state, $$state.ctx);
  initialSpecNode.setInitialValue(initialStatePath, clone(initialValue));

  const initialSpec = initialSpecNode.getSpec();
  const value = initialSpec.isImmutable
    ? mkUntrackedValue(initialValue)
    : clone(initialValue);
  set(proxyRoot, initialStatePath, value);
  //immediately fire onChange
  if (initialSpec.onChangeProp) {
    $$state.props[initialSpec.onChangeProp]?.(initialValue);
  }

  return initialValue;
}

function create$StateProxy(
  $$state: Internal$State,
  leafHandlers: (
    node: StateSpecNode<any>,
    path: ObjectPath,
    proxyRoot: any
  ) => ProxyHandler<any>
) {
  const rec = (
    currPath: ObjectPath,
    currNode: StateSpecNode<any>,
    isOutside: boolean,
    proxyRoot: any,
    initialObject?: any
  ) => {
    const getNextPath = (property: string | number | symbol) => [
      ...currPath,
      isNum(property) ? +property : (property as string),
    ];
    const spec = currNode.getSpec();
    const handlers: ProxyHandler<any> = {
      deleteProperty(target, property) {
        if (
          !isOutside &&
          !currNode.isLeaf() &&
          !currNode.hasArrayTransition() &&
          !isNum(property)
        ) {
          throw new Error(
            "Can't delete a property in the middle of the state spec"
          );
        }
        delete get($$state.stateValues, currPath)[property];
        if (spec.onChangeProp) {
          //we are always in a leaf, since we only have two cases:
          // 1 - delete properties outside the state tree
          // 2 - delete indices in repeated implicit states, but these can't be exposed, so they don't have onChangeProp
          $$state.props[spec.onChangeProp]?.(
            get($$state.stateValues, currPath.slice(spec.pathObj.length))
          );
        }
        return Reflect.deleteProperty(target, property);
      },
      get(target, property, receiver) {
        proxyRoot = proxyRoot == null ? receiver : proxyRoot;
        const nextPath = getNextPath(property);

        if (isOutside || currNode.isLeaf()) {
          return Reflect.get(target, property, receiver);
        }
        const nextNode = currNode.makeTransition(property);
        if (nextNode?.isLeaf()) {
          return leafHandlers(nextNode, nextPath, proxyRoot).get?.(
            target,
            property,
            receiver
          );
        } else if (nextNode && !(property in target)) {
          target[property] = rec(
            nextPath,
            nextNode,
            false,
            proxyRoot,
            undefined
          );
        }
        return Reflect.get(target, property, receiver);
      },
      set(target, property, value, receiver) {
        proxyRoot = proxyRoot == null ? receiver : proxyRoot;
        const nextPath = getNextPath(property);
        let nextNode = currNode.makeTransition(property);

        if (property === "registerInitFunc" && currPath.length === 0) {
          return Reflect.set(target, property, value, receiver);
        }
        if (!nextNode && currNode.hasArrayTransition()) {
          set($$state.stateValues, nextPath, value);
          //array can set his own properties such as length, map, ...
          return Reflect.set(target, property, value, receiver);
        }
        if (nextNode?.isLeaf()) {
          leafHandlers(nextNode, nextPath, proxyRoot).set?.(
            target,
            property,
            value,
            receiver
          );
        }
        if (!isOutside && !currNode.isLeaf() && !nextNode) {
          // can't set an unknown field in $state
          return false;
        }
        // we keep pointing to the leaf
        if (!nextNode) {
          assert(isOutside || currNode.isLeaf, "unexpected update in nextNode");
          nextNode = currNode;
        }
        if (canProxy(value)) {
          target[property] = rec(
            nextPath,
            nextNode,
            isOutside || currNode.isLeaf(),
            proxyRoot,
            value
          );
        } else if (!isOutside && !currNode.isLeaf() && !nextNode?.isLeaf()) {
          throw new Error("inserting a primitive value into a non-leaf");
        } else {
          Reflect.set(target, property, value, receiver);
        }
        nextNode.getAllSpecs().forEach((spec) => {
          if (spec.onChangeProp) {
            $$state.props[spec.onChangeProp]?.(value);
          }
        });
        const newValue =
          (isOutside || currNode.isLeaf()) && currNode.getSpec().isImmutable
            ? mkUntrackedValue(value)
            : value;
        set($$state.stateValues, nextPath, newValue);
        return true;
      },
    };
    const baseObject =
      !isOutside && !currNode.isLeaf()
        ? currNode.hasArrayTransition()
          ? []
          : {}
        : Array.isArray(initialObject)
        ? []
        : Object.create(Object.getPrototypeOf(initialObject));
    const proxyObj = new Proxy(baseObject, handlers);
    if (initialObject) {
      Reflect.ownKeys(initialObject).forEach((key) => {
        const desc = Object.getOwnPropertyDescriptor(
          initialObject,
          key
        ) as PropertyDescriptor;
        if (desc.get || desc.set) {
          Object.defineProperty(baseObject, key, desc);
        } else {
          proxyObj[key] = initialObject[key];
        }
      });
    }
    return proxyObj;
  };

  return rec([], $$state.rootSpecTree, false, undefined, undefined);
}

const mkUntrackedValue = (o: any) =>
  o != null && typeof o === "object" ? ref(o) : o;

export function useDollarState(
  specs: $StateSpec<any>[],
  props: Record<string, any>,
  $ctx?: Record<string, any>
): $State {
  const $$state = React.useRef<Internal$State>(
    (() => {
      const rootSpecTree = buildTree(specs);
      return {
        rootSpecTree: rootSpecTree,
        specTreeLeaves: getLeaves(rootSpecTree),
        stateValues: createValtioProxy({}),
        props: {},
        ctx: {},
        registrationsQueue: [],
      };
    })()
  ).current;
  $$state.props = props;
  $$state.ctx = $ctx ?? {};
  const $state = React.useRef(
    (() => {
      const useRef$state = Object.assign(
        create$StateProxy($$state, (node, path, proxyRoot) => {
          if (!node.hasState(path)) {
            node.createStateCell(path);
            const spec = node.getSpec();
            if (spec.initFunc) {
              initializeStateValue($$state, node, path, proxyRoot);
            } else if (!spec.valueProp) {
              set(proxyRoot, path, spec.initVal);
            }
          }
          return {
            get(target, property, receiver) {
              const spec = node.getSpec();
              if (spec.valueProp) {
                return $$state.props[spec.valueProp];
              } else {
                return Reflect.get(target, property, receiver);
              }
            },
          };
        }),
        {
          registerInitFunc: function <T>(
            pathStr: string,
            f: InitFunc<T>,
            repetitionIndex?: number[]
          ) {
            const { node, realPath } = findStateCell(
              $$state.rootSpecTree,
              pathStr,
              repetitionIndex
            );
            if (!node.hasState(realPath)) {
              node.createStateCell(realPath);
            }
            if (
              !deepEqual(
                node.getState(realPath).initialValue,
                f($$state.props, useRef$state, $$state.ctx)
              )
            ) {
              $$state.registrationsQueue.push({ node, path: realPath, f });
            }
          },
        }
      );
      return useRef$state;
    })()
  ).current;

  // For each spec with an initFunc, evaluate it and see if
  // the init value has changed. If so, reset its state.
  const resetSpecs: {
    stateCell: StateCell<any>;
    node: StateSpecNode<any>;
  }[] = [];
  $$state.specTreeLeaves
    .flatMap((node) => node.states().map((stateCell) => ({ stateCell, node })))
    .forEach(({ stateCell, node }) => {
      if (stateCell.registeredInitFunc) {
        const newInit = stateCell.registeredInitFunc(props, $state, $ctx ?? {});
        if (!deepEqual(newInit, stateCell.initialValue)) {
          resetSpecs.push({ stateCell, node });
        }
      }
    });
  const reInitializeState = (
    node: StateSpecNode<any>,
    stateCell: StateCell<any>
  ) => {
    const newInit = initializeStateValue($$state, node, stateCell.path, $state);
    const spec = node.getSpec();
    if (spec.onChangeProp) {
      $$state.props[spec.onChangeProp]?.(newInit);
    }
  };
  useIsomorphicLayoutEffect(() => {
    resetSpecs.forEach(({ stateCell, node }) => {
      reInitializeState(node, stateCell);
    });
  }, [props, resetSpecs]);
  useIsomorphicLayoutEffect(() => {
    $$state.registrationsQueue.forEach(({ node, path, f }) => {
      const stateCell = node.getState(path);
      stateCell.registeredInitFunc = f;
      reInitializeState(node, stateCell);
    });
    $$state.registrationsQueue = [];
  }, [$$state.registrationsQueue]);
  // immediately initialize exposed non-private states
  useIsomorphicLayoutEffect(() => {
    $$state.specTreeLeaves.forEach((node) => {
      const spec = node.getSpec();
      if (!spec.isRepeated && spec.type !== "private" && spec.initFunc) {
        node.createStateCell(spec.pathObj as string[]);
        initializeStateValue($$state, node, spec.pathObj as string[], $state);
      }
    });
  }, []);

  // Re-render if any value changed in one of these objects
  useSnapshot($$state.stateValues, { sync: true });
  return $state;
}

export default useDollarState;
