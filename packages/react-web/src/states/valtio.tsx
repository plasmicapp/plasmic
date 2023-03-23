import clone from "clone";
import get from "dlv";
import deepEqual from "fast-deep-equal";
import React from "react";
import { proxy as createValtioProxy, ref, useSnapshot } from "valtio";
import { ensure } from "../common";
import {
  CyclicStatesReferencesError,
  InvalidOperation,
  UnknownError,
} from "./errors";
import {
  buildTree,
  findStateCell,
  getSpecTreeLeaves,
  StateSpecNode,
  updateTree,
} from "./graph";
import {
  arrayEq,
  assert,
  getStateCells,
  set,
  useIsomorphicLayoutEffect,
} from "./helpers";
import {
  $State,
  $StateSpec,
  DeprecatedInitFunc,
  DollarStateEnv,
  InitFunc,
  InitFuncEnv,
  Internal$State,
  NoUndefinedField,
  ObjectPath,
  PLASMIC_STATE_PROXY_SYMBOL,
  StateCell,
  UNINITIALIZED,
} from "./types";

function isNum(value: string | number | symbol): value is number {
  return typeof value === "symbol" ? false : !isNaN(+value);
}

function canProxy(value: any) {
  return typeof value === "object" && value != null;
}

export const proxyObjToStateCell = new WeakMap<
  object,
  Record<string | number | symbol, StateCell<any>>
>();

function ensureStateCell(
  target: any,
  property: string | number | symbol,
  path: ObjectPath,
  node: StateSpecNode<any>
) {
  if (!proxyObjToStateCell.has(target)) {
    proxyObjToStateCell.set(target, {});
  }
  const stateCell = proxyObjToStateCell.get(target)!;
  if (!(property in stateCell)) {
    stateCell[property as any] = {
      listeners: [],
      initialValue: UNINITIALIZED,
      path,
      node,
      initFunc: node.getSpec().initFunc,
      initFuncHash: node.getSpec().initFuncHash ?? "",
    };
  }
  return stateCell[property as any];
}

function getStateCell(target: any, property: string | number | symbol) {
  return proxyObjToStateCell.get(target)?.[property as any];
}

export function tryGetStateCellFrom$StateRoot(
  $state: $State,
  path: ObjectPath
) {
  if (path.length === 0) {
    throw new UnknownError("expected a path with length greater than 0");
  }
  const target = get($state, path.slice(0, -1));
  get(target, path.slice(-1)); // create state cell;
  return getStateCell(target, path.slice(-1)[0]);
}

export function getStateCellFrom$StateRoot($state: $State, path: ObjectPath) {
  return ensure(tryGetStateCellFrom$StateRoot($state, path));
}

function initializeStateValue(
  $$state: Internal$State,
  initialStateCell: StateCell<any>,
  proxyRoot: any
) {
  const initialStateName = initialStateCell.node.getSpec().path;
  const stateAccess: Set<{
    stateCell: StateCell<any>;
  }> = new Set();
  $$state.stateInitializationEnv.visited.add(initialStateName);
  $$state.stateInitializationEnv.stack.push(initialStateName);
  const $state = create$StateProxy($$state, (internalStateCell) => ({
    get() {
      const spec = internalStateCell.node.getSpec();
      if ($$state.stateInitializationEnv.visited.has(spec.path)) {
        // cyclic reference found
        const stateAccessCycle: string[] = [spec.path];
        while ($$state.stateInitializationEnv.stack.length > 0) {
          const curr = $$state.stateInitializationEnv.stack.pop();
          if (!curr) {
            break;
          }
          stateAccessCycle.push(curr);
          if (curr === spec.path) {
            throw new CyclicStatesReferencesError(stateAccessCycle);
          }
        }
        throw new UnknownError("Internal error: cycle not found");
      }

      const stateCell = getStateCellFrom$StateRoot(
        proxyRoot,
        internalStateCell.path
      );
      stateAccess.add({ stateCell });
      if (spec.valueProp) {
        return $$state.env.$props[spec.valueProp];
      } else if (spec.initFunc && stateCell.initialValue === UNINITIALIZED) {
        return initializeStateValue($$state, stateCell, proxyRoot);
      }
      return get(proxyRoot, stateCell.path);
    },
    set() {
      throw new InvalidOperation(
        `Cannot update state values during initialization`
      );
    },
  }));

  stateAccess.forEach(({ stateCell }) => {
    stateCell.listeners.push(() => {
      const newValue = invokeInitFuncBackwardsCompatible(
        initialStateCell.node.getSpec().initFunc!,
        {
          $state,
          ...(initialStateCell.overrideEnv ?? $$state.env),
        }
      );
      set(proxyRoot, initialStateCell.path, newValue);
    });
  });

  const initialValue = invokeInitFuncBackwardsCompatible(
    initialStateCell.initFunc!,
    {
      $state,
      ...(initialStateCell.overrideEnv ?? $$state.env),
    }
  );
  initialStateCell.initialValue = clone(initialValue);

  const initialSpec = initialStateCell.node.getSpec();
  const value = initialSpec.isImmutable
    ? mkUntrackedValue(initialValue)
    : clone(initialValue);
  set(proxyRoot, initialStateCell.path, value);
  //immediately fire onChange
  if (initialSpec.onChangeProp) {
    $$state.env.$props[initialSpec.onChangeProp]?.(initialValue);
  }
  $$state.stateInitializationEnv.visited.delete(initialStateName);
  $$state.stateInitializationEnv.stack.pop();
  return initialValue;
}

function create$StateProxy(
  $$state: Internal$State,
  leafHandlers: (stateCell: StateCell<any>) => ProxyHandler<any>
) {
  let proxyRoot: any;
  const rec = (
    currPath: ObjectPath,
    currNode: StateSpecNode<any>,
    isOutside: boolean,
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
          throw new InvalidOperation(
            "Can't delete a property in the middle of the state spec"
          );
        }
        delete get($$state.stateValues, currPath)[property];
        if (spec.onChangeProp) {
          //we are always in a leaf, since we only have two cases:
          // 1 - delete properties outside the state tree
          // 2 - delete indices in repeated implicit states, but these can't be exposed, so they don't have onChangeProp
          $$state.env.$props[spec.onChangeProp]?.(
            get(proxyRoot, currPath.slice(spec.pathObj.length))
          );
        }
        return Reflect.deleteProperty(target, property);
      },
      get(target, property, receiver) {
        if (property === PLASMIC_STATE_PROXY_SYMBOL) {
          return {
            node: currNode,
            path: currPath,
            isOutside,
          };
        }
        const nextPath = getNextPath(property);

        if (isOutside || currNode.isLeaf()) {
          return Reflect.get(target, property, receiver);
        }
        const nextNode = currNode.makeTransition(property);
        if (nextNode?.isLeaf()) {
          return leafHandlers(
            ensureStateCell(receiver, property, nextPath, nextNode)
          ).get?.(target, property, receiver);
        } else if (nextNode && !(property in target)) {
          target[property] = rec(nextPath, nextNode, false, undefined);
        }
        return Reflect.get(target, property, receiver);
      },
      set(target, property, value, receiver) {
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
          leafHandlers(
            ensureStateCell(receiver, property, nextPath, nextNode)
          ).set?.(target, property, value, receiver);
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
            value
          );
        } else if (!isOutside && !currNode.isLeaf() && !nextNode?.isLeaf()) {
          throw new InvalidOperation(
            "inserting a primitive value into a non-leaf"
          );
        } else {
          Reflect.set(target, property, value, receiver);
        }
        if (currNode.isLeaf()) {
          if (spec.onChangeProp) {
            $$state.env.$props[spec.onChangeProp]?.(target);
          }
        } else {
          nextNode.getAllSpecs().forEach((spec) => {
            if (spec.onChangeProp) {
              $$state.env.$props[spec.onChangeProp]?.(value);
            }
          });
        }
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
        : Object.create(Object.getPrototypeOf(initialObject ?? {}));
    const proxyObj = new Proxy(baseObject, handlers);
    if (currPath.length === 0) {
      proxyRoot = proxyObj;
    }
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

  return rec([], $$state.rootSpecTree, false, undefined);
}

const mkUntrackedValue = (o: any) =>
  o != null && typeof o === "object" ? ref(o) : o;

const envFieldsAreNonNill = (
  env: DollarStateEnv
): NoUndefinedField<DollarStateEnv> => ({
  $props: env.$props,
  $ctx: env.$ctx ?? {},
  $queries: env.$queries ?? {},
});

/**
 * We need to support two versions with different parameters to be backward compatible
 *    {
 *       specs: $StateSpec<any>[],
 *       props: Record<string, any>,
 *       $ctx?: Record<string, any>,
 *       opts?: { inCanvas: boolean; }
 *    }
 *    {
 *       specs: $StateSpec<any>[],
 *       env: { $props; $queries; $ctx },
 *       opts?: { inCanvas: boolean }
 *    }
 */
function extractDollarStateParametersBackwardCompatible(
  ...rest: any[]
): {
  env: DollarStateEnv;
  opts?: { inCanvas: boolean };
} {
  if ("$props" in rest[0]) {
    // latest version
    return {
      env: rest[0],
      opts: rest[1],
    };
  } else {
    return {
      env: {
        $props: rest[0],
        $ctx: rest[1],
        $queries: {},
      },
      opts: rest[2],
    };
  }
}

function invokeInitFuncBackwardsCompatible<T>(
  initFunc: InitFunc<T> | DeprecatedInitFunc<T>,
  env: NoUndefinedField<InitFuncEnv>
) {
  if (initFunc.length > 1) {
    return (initFunc as DeprecatedInitFunc<T>)(
      env.$props,
      env.$state,
      env.$ctx
    );
  } else {
    return (initFunc as InitFunc<T>)(env);
  }
}

export function useDollarState(
  specs: $StateSpec<any>[],
  ...rest: any[]
): $State {
  const { env, opts } = extractDollarStateParametersBackwardCompatible(...rest);
  const $$state = React.useRef<Internal$State>(
    (() => {
      const rootSpecTree = buildTree(specs);
      return {
        rootSpecTree: rootSpecTree,
        specTreeLeaves: getSpecTreeLeaves(rootSpecTree),
        stateValues: createValtioProxy({}),
        env: envFieldsAreNonNill(env),
        specs: [],
        registrationsQueue: createValtioProxy([]),
        stateInitializationEnv: { stack: [], visited: new Set<string>() },
      };
    })()
  ).current;
  $$state.env = envFieldsAreNonNill(env);
  $$state.specs = specs;

  const create$State = React.useCallback(() => {
    const $state = Object.assign(
      create$StateProxy($$state, (stateCell) => {
        const spec = stateCell.node.getSpec();
        if (stateCell.initialValue === UNINITIALIZED && spec.initFunc) {
          initializeStateValue($$state, stateCell, $state);
        } else if (
          stateCell.initialValue === UNINITIALIZED &&
          !spec.valueProp
        ) {
          stateCell.initialValue = spec.initVal;
          set($state, stateCell.path, spec.initVal);
        }
        return {
          get(target, property, receiver) {
            const spec = stateCell.node.getSpec();
            if (spec.valueProp) {
              return $$state.env.$props[spec.valueProp];
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
          repetitionIndex?: number[],
          overrideEnv?: DollarStateEnv
        ) {
          const { node, realPath } = findStateCell(
            $$state.rootSpecTree,
            pathStr,
            repetitionIndex
          );
          const stateCell = getStateCellFrom$StateRoot($state, realPath);
          const env = overrideEnv
            ? envFieldsAreNonNill(overrideEnv)
            : $$state.env;
          if (!deepEqual(stateCell.initialValue, f({ $state, ...env }))) {
            $$state.registrationsQueue.push(
              mkUntrackedValue({
                node,
                path: realPath,
                f,
                overrideEnv: overrideEnv
                  ? envFieldsAreNonNill(overrideEnv)
                  : undefined,
              })
            );
          }
        },
      }
    );
    return $state;
  }, []);
  const ref = React.useRef<undefined | $State>(undefined);
  if (!ref.current) {
    ref.current = create$State();
  }
  let $state = ref.current as $State;
  if (opts?.inCanvas) {
    $$state.rootSpecTree = updateTree($$state.rootSpecTree, specs);
    const newLeaves = getSpecTreeLeaves($$state.rootSpecTree);
    if (!arrayEq(newLeaves, $$state.specTreeLeaves)) {
      const old$state = $state;
      $state = ref.current = create$State();
      $$state.specTreeLeaves = newLeaves;
      getStateCells(newLeaves, $$state.rootSpecTree).forEach(({ path }) => {
        const oldStateCell = tryGetStateCellFrom$StateRoot(old$state, path);
        if (oldStateCell) {
          set($state, path, get(old$state, path));
        }
      });
    }
    // we need to eager initialize all states in canvas to populate the data picker
    $$state.specTreeLeaves.forEach((node) => {
      const spec = node.getSpec();
      if (spec.isRepeated) {
        return;
      }
      const stateCell = getStateCellFrom$StateRoot(
        $state,
        spec.pathObj as string[]
      );
      const newSpec = specs.find((sp) => sp.path === spec.path);
      if (!newSpec || stateCell.initFuncHash === newSpec?.initFuncHash) {
        return;
      }
      stateCell.initFunc = newSpec.initFunc;
      stateCell.initFuncHash = newSpec.initFuncHash ?? "";
      const init = spec.valueProp
        ? $$state.env.$props[spec.valueProp]
        : spec.initFunc
        ? initializeStateValue($$state, stateCell, $state)
        : spec.initVal;
      set($state, spec.pathObj, init);
    });
  }

  // For each spec with an initFunc, evaluate it and see if
  // the init value has changed. If so, reset its state.
  const resetSpecs: {
    stateCell: StateCell<any>;
  }[] = [];
  getStateCells($state, $$state.rootSpecTree).forEach((stateCell) => {
    if (stateCell.initFunc) {
      const newInit = invokeInitFuncBackwardsCompatible(stateCell.initFunc, {
        $state,
        ...(stateCell.overrideEnv ?? envFieldsAreNonNill(env)),
      });
      if (!deepEqual(newInit, stateCell.initialValue)) {
        resetSpecs.push({ stateCell });
      }
    }
  });
  const reInitializeState = (stateCell: StateCell<any>) => {
    const newInit = initializeStateValue($$state, stateCell, $state);
    const spec = stateCell.node.getSpec();
    if (spec.onChangeProp) {
      $$state.env.$props[spec.onChangeProp]?.(newInit);
    }
  };
  useIsomorphicLayoutEffect(() => {
    resetSpecs.forEach(({ stateCell }) => {
      reInitializeState(stateCell);
    });
  }, [env.$props, resetSpecs]);
  useIsomorphicLayoutEffect(() => {
    while ($$state.registrationsQueue.length) {
      const { path, f, overrideEnv } = $$state.registrationsQueue.shift()!;
      const stateCell = getStateCellFrom$StateRoot($state, path);
      stateCell.initFunc = f;
      stateCell.overrideEnv = overrideEnv;
      reInitializeState(stateCell);
    }
  }, [$$state.registrationsQueue.length]);
  // immediately initialize exposed non-private states
  useIsomorphicLayoutEffect(() => {
    $$state.specTreeLeaves.forEach((node) => {
      const spec = node.getSpec();
      if (!spec.isRepeated && spec.type !== "private" && spec.initFunc) {
        const stateCell = getStateCellFrom$StateRoot(
          $state,
          spec.pathObj as ObjectPath
        );
        initializeStateValue($$state, stateCell, $state);
      }
    });
  }, []);

  // Re-render if any value changed in one of these objects
  useSnapshot($$state.stateValues, { sync: true });
  useSnapshot($$state.registrationsQueue, { sync: true });
  return $state;
}

export default useDollarState;
