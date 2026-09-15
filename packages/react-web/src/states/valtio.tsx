import clone from "clone";
import get from "dlv";
import React from "react";
import {
  proxy as createValtioProxy,
  ref as createValtioRef,
  getVersion as isValtioProxy,
  subscribe,
  useSnapshot,
} from "valtio";
import { ensure } from "../common";
import { useIsomorphicLayoutEffect } from "../react-utils";
import {
  CyclicStatesReferencesError,
  InvalidOperation,
  UnknownError,
} from "./errors";
import {
  StateSpecNode,
  buildTree,
  findStateCell,
  getSpecTreeLeaves,
  updateTree,
} from "./graph";
import { arrayEq, deepEqual, getStateCells, isNum, set } from "./helpers";
import {
  $State,
  $StateSpec,
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
import defer = setTimeout;

function canProxy(value: any) {
  return typeof value === "object" && value != null;
}

export const proxyObjToStateCell = new WeakMap<
  object,
  Record<string | number | symbol, StateCell<any>>
>();
export const valtioSubscriptions = new WeakMap<
  object,
  ReturnType<typeof subscribe>[]
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

export function unsubscribeToValtio(
  $$state: Internal$State,
  statePath: ObjectPath
) {
  const oldValue = get($$state.stateValues, statePath);
  if (isValtioProxy(oldValue)) {
    valtioSubscriptions.get(oldValue)?.forEach((f) => f());
    valtioSubscriptions.delete(oldValue);
  }
}

export function subscribeToValtio(
  $$state: Internal$State,
  statePath: ObjectPath,
  node: StateSpecNode<any>
) {
  const spec = node.getSpec();
  const maybeValtioProxy = spec.valueProp
    ? $$state.env.$props[spec.valueProp]
    : get($$state.stateValues, statePath);
  if (
    isValtioProxy(maybeValtioProxy) &&
    (spec.onChangeProp || (spec.onMutate && node.isLeaf()))
  ) {
    const unsub = subscribe(maybeValtioProxy, () => {
      if (spec.onMutate && node.isLeaf()) {
        spec.onMutate(
          maybeValtioProxy,
          spec.refName ? $$state.env.$refs[spec.refName] : undefined
        );
      }
      $$state.env.$props[spec.onChangeProp!]?.(
        spec.valueProp
          ? $$state.env.$props[spec.valueProp]
          : get($$state.stateValues, statePath)
      );
    });
    if (!valtioSubscriptions.has(maybeValtioProxy)) {
      valtioSubscriptions.set(maybeValtioProxy, []);
    }
    ensure(valtioSubscriptions.get(maybeValtioProxy)).push(unsub);
  }
}

function initializeStateValue(
  $$state: Internal$State,
  initialStateCell: StateCell<any>,
  proxyRoot: any
) {
  const initialStateName = initialStateCell.node.getSpec().path;
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

  const initialValue = invokeInitFunc(initialStateCell.initFunc!, {
    $state,
    ...(initialStateCell.overrideEnv ?? $$state.env),
  });
  const initialSpec = initialStateCell.node.getSpec();

  // Try to clone initialValue. It can fail if it's a PlasmicUndefinedDataProxy
  // and we still want to clear some states and return the initialValue.
  try {
    const clonedValue = clone(initialValue);
    initialStateCell.initialValue = clonedValue;

    const value = initialSpec.isImmutable
      ? mkUntrackedValue(initialValue)
      : clonedValue;
    set(proxyRoot, initialStateCell.path, value);
  } catch {
    // Setting the state to undefined to make sure it gets re-initialized
    // in case it changes values.
    initialStateCell.initialValue = undefined;
    set(proxyRoot, initialStateCell.path, undefined);
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
  const rec = (currPath: ObjectPath, currNode: StateSpecNode<any>) => {
    const getNextPath = (property: string | number | symbol) => [
      ...currPath,
      isNum(property) ? +property : (property as string),
    ];
    const spec = currNode.getSpec();
    const handlers: ProxyHandler<any> = {
      deleteProperty(target, property) {
        if (
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
          };
        }
        const nextPath = getNextPath(property);

        const nextNode = currNode.makeTransition(property);
        if (nextNode?.isLeaf()) {
          return leafHandlers(
            ensureStateCell(receiver, property, nextPath, nextNode)
          ).get?.(target, property, receiver);
        } else if (nextNode && !(property in target)) {
          target[property] = rec(nextPath, nextNode);
        }
        return Reflect.get(target, property, receiver);
      },
      set(target, property, value, receiver) {
        const nextPath = getNextPath(property);
        const nextNode = currNode.makeTransition(property);
        const nextSpec = nextNode?.getSpec();

        if (
          (property === "registerInitFunc" ||
            property === "eagerInitializeStates") &&
          currPath.length === 0
        ) {
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
          Reflect.set(target, property, value, receiver);
          if (nextSpec?.onChangeProp) {
            const pathKey = JSON.stringify(nextPath);
            const isInitOnChange =
              // If we are dealing with a valueProp it means that this state cell value is provided by the parent
              // and we don't need to consider initialization calls for it.
              !nextSpec.valueProp && !$$state.initializedLeafPaths.has(pathKey);

            // We need to call the onChangeProp during initialization process so that the parent
            // state can be updated with the correct value. We will provide an additional parameter
            // to the onChangeProp function to indicate that the call is made during initialization.
            $$state.env.$props[nextSpec.onChangeProp]?.(value, {
              _plasmic_state_init_: isInitOnChange,
            });

            if (isInitOnChange) {
              $$state.initializedLeafPaths.add(pathKey);
            }
          }
        }
        if (!nextNode) {
          // can't set an unknown field in $state
          return false;
        }
        if (canProxy(value) && !nextNode.isLeaf()) {
          target[property] = rec(nextPath, nextNode);
          Reflect.ownKeys(value).forEach((key) => {
            target[property][key] = value[key];
          });
        } else if (!nextNode.isLeaf()) {
          throw new InvalidOperation(
            "inserting a primitive value into a non-leaf"
          );
        }
        const newValue =
          nextNode.isLeaf() && nextSpec?.isImmutable
            ? mkUntrackedValue(value)
            : value;

        unsubscribeToValtio($$state, nextPath);
        set($$state.stateValues, nextPath, newValue);
        subscribeToValtio($$state, nextPath, nextNode);
        return true;
      },
    };
    const baseObject = currNode.hasArrayTransition() ? [] : {};
    const proxyObj = new Proxy(baseObject, handlers);
    if (currPath.length === 0) {
      proxyRoot = proxyObj;
    }
    return proxyObj;
  };

  return rec([], $$state.rootSpecTree);
}

const mkUntrackedValue = (o: any) =>
  o != null && typeof o === "object" ? createValtioRef(o) : o;

const envFieldsAreNonNill = (
  env: DollarStateEnv
): NoUndefinedField<DollarStateEnv> => ({
  $props: env.$props,
  $ctx: env.$ctx ?? {},
  $queries: env.$queries ?? {},
  $q: env.$q ?? {},
  $refs: env.$refs ?? {},
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
function extractDollarStateParametersBackwardCompatible(...rest: any[]): {
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
        $q: {},
      },
      opts: rest[2],
    };
  }
}

function invokeInitFunc<T>(
  initFunc: InitFunc<T>,
  env: NoUndefinedField<InitFuncEnv>
) {
  return initFunc(env);
}

function initFuncEnv(
  $$state: Internal$State,
  stateCell: StateCell<any>,
  $state: $State
): NoUndefinedField<InitFuncEnv> {
  return { $state, ...(stateCell.overrideEnv ?? $$state.env) };
}

// Pure check with no effect on the reset budget; the layout scan decides.
function initValueChanged(
  $$state: Internal$State,
  stateCell: StateCell<any>,
  $state: $State
) {
  try {
    return !deepEqual(
      invokeInitFunc(
        stateCell.initFunc!,
        initFuncEnv($$state, stateCell, $state)
      ),
      stateCell.initialValue
    );
  } catch {
    return false;
  }
}

// Bound consecutive resets without a settled evaluation, even on slow renders.
const MAX_UNSETTLED_RESETS = 5;

function warnUnstableInitFunc(stateCell: StateCell<any>, reason: string) {
  if (stateCell.warnedUnstableInitFunc) {
    return;
  }
  stateCell.warnedUnstableInitFunc = true;
  console.warn(
    `Plasmic: the initial value of state "${stateCell.path.join(
      "."
    )}" ${reason}, so it is kept at its current value instead of being reset. To set a random or time-based value, run an interaction from a Side Effect component instead.`
  );
}

/**
 * Whether `stateCell` should be reset to what `initFunc` now returns. An
 * initFunc that returns a new value every time it runs would reset on every
 * render, and each reset renders again, so the loop never ends. We refuse to
 * reset in two cases:
 *
 * - Two back-to-back calls disagree, indicating an unstable initializer.
 * - Too many resets occur without a settled evaluation. This also catches
 *   values that are stable within a render but drift between renders.
 *
 * This is a circuit breaker, not a proof of determinism: legitimate feedback
 * chains can also exceed the budget, and unstable functions can return equal
 * values by chance. Initializers must be pure and deterministic for fixed inputs.
 *
 * Rejected probes never change the installed initial value used by preview
 * reset. A rejected value that repeats on a later render can reopen the budget.
 */
function shouldReInitialize<T>(
  stateCell: StateCell<T>,
  initFunc: InitFunc<T>,
  env: NoUndefinedField<InitFuncEnv>
) {
  let newInit: T;
  let repeats: boolean;
  try {
    newInit = invokeInitFunc(initFunc, env);
    if (deepEqual(newInit, stateCell.initialValue)) {
      stateCell.unsettledResetCount = undefined;
      stateCell.rejectedInitProbe = undefined;
      return false;
    }
    repeats = deepEqual(invokeInitFunc(initFunc, env), newInit);
  } catch {
    // initFunc can throw, e.g. if it tries to access loading $queries. Swallow here
    // since we only care whether the init value changed, not error handling.
    return false;
  }
  let reason: string | undefined;
  if (!repeats) {
    reason = "is not deterministic";
  } else {
    const { rejectedInitProbe } = stateCell;
    const reopened =
      rejectedInitProbe && deepEqual(newInit, rejectedInitProbe.value);
    stateCell.unsettledResetCount = reopened
      ? 1
      : (stateCell.unsettledResetCount ?? 0) + 1;
    if (stateCell.unsettledResetCount > MAX_UNSETTLED_RESETS) {
      reason = "keeps changing";
    }
  }
  stateCell.rejectedInitProbe = reason ? { value: newInit } : undefined;
  if (reason) {
    warnUnstableInitFunc(stateCell, reason);
  }
  return !reason;
}

export function useDollarState(
  specs: $StateSpec<any>[],
  ...rest: any[]
): $State {
  const { env, opts } = extractDollarStateParametersBackwardCompatible(...rest);
  const [, setState] = React.useState<[]>();
  // Set for the whole render pass and cleared by the layout effect, which applies
  // registrations. One that arrives outside a render must schedule a render to be applied.
  const rendering = React.useRef(false);
  rendering.current = true;

  const mountedRef = React.useRef<boolean>(false);
  const isMounted = React.useCallback(() => mountedRef.current, []);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pendingUpdate = React.useRef(false);

  const forceUpdate = React.useCallback(
    () =>
      defer(() => {
        if (isMounted()) {
          setState([]);
          pendingUpdate.current = false;
        }
      }),
    []
  );

  const $$state = React.useRef<Internal$State>(
    (() => {
      const rootSpecTree = buildTree(specs);
      return {
        rootSpecTree: rootSpecTree,
        specTreeLeaves: getSpecTreeLeaves(rootSpecTree),
        stateValues: createValtioProxy({}),
        env: envFieldsAreNonNill(env),
        stateInitializationEnv: { stack: [], visited: new Set<string>() },
        initializedLeafPaths: new Set(),
      };
    })()
  ).current;
  $$state.env = envFieldsAreNonNill(env);

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
          get() {
            const currSpec = stateCell.node.getSpec();
            if (currSpec.valueProp) {
              const valueProp = $$state.env.$props[currSpec.valueProp];
              subscribeToValtio($$state, stateCell.path, stateCell.node);
              return valueProp;
            } else {
              return get($$state.stateValues, stateCell.path);
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
          const { realPath } = findStateCell(
            $$state.rootSpecTree,
            pathStr,
            repetitionIndex
          );
          const stateCell = getStateCellFrom$StateRoot($state, realPath);
          // The first initializer always applies, even if unstable, like the
          // lazy initialization of a spec initFunc.
          stateCell.pendingInit ||= !stateCell.initFunc;
          stateCell.initFunc = f;
          stateCell.overrideEnv = overrideEnv
            ? envFieldsAreNonNill(overrideEnv)
            : undefined;
          if (
            !rendering.current &&
            !pendingUpdate.current &&
            (stateCell.pendingInit ||
              initValueChanged($$state, stateCell, $state))
          ) {
            pendingUpdate.current = true;
            forceUpdate();
          }
        },
        ...(opts?.inCanvas
          ? {
              eagerInitializeStates: (stateSpecs: $StateSpec<any>[]) => {
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
                  const newSpec = stateSpecs.find(
                    (sp) => sp.path === spec.path
                  );
                  if (
                    !newSpec ||
                    (stateCell.initFuncHash === (newSpec?.initFuncHash ?? "") &&
                      stateCell.initialValue !== UNINITIALIZED)
                  ) {
                    return;
                  }
                  stateCell.initFunc = newSpec.initFunc;
                  stateCell.initFuncHash = newSpec.initFuncHash ?? "";
                  stateCell.unsettledResetCount = undefined;
                  stateCell.warnedUnstableInitFunc = undefined;
                  stateCell.rejectedInitProbe = undefined;
                  const init = spec.valueProp
                    ? $$state.env.$props[spec.valueProp]
                    : spec.initFunc
                    ? initializeStateValue($$state, stateCell, $state)
                    : spec.initVal;
                  set($state, spec.pathObj, init);
                });
              },
            }
          : {}),
      }
    );
    return $state;
  }, [opts?.inCanvas]);
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
      getStateCells(old$state, $$state.rootSpecTree).forEach(({ path }) => {
        const oldStateCell = tryGetStateCellFrom$StateRoot(old$state, path);
        if (oldStateCell) {
          set($state, path, get(old$state, path));
          const newStateCell = getStateCellFrom$StateRoot($state, path);
          newStateCell.initialValue = oldStateCell.initialValue;
        }
      });
    }
  }

  useIsomorphicLayoutEffect(() => {
    rendering.current = false;
    // Scan every cell before resetting any, so each initFunc sees the same
    // pre-reset state.
    const resetCells = getStateCells($state, $$state.rootSpecTree).filter(
      (stateCell) =>
        stateCell.pendingInit ||
        (stateCell.initFunc &&
          shouldReInitialize(
            stateCell,
            stateCell.initFunc,
            initFuncEnv($$state, stateCell, $state)
          ))
    );
    resetCells.forEach((stateCell) => {
      stateCell.pendingInit = undefined;
      const newInit = initializeStateValue($$state, stateCell, $state);
      const spec = stateCell.node.getSpec();
      if (spec.onChangeProp) {
        $$state.env.$props[spec.onChangeProp]?.(newInit);
      }
    });
  });
  // immediately initialize exposed non-private states
  useIsomorphicLayoutEffect(() => {
    $$state.specTreeLeaves.forEach((node) => {
      const spec = node.getSpec();
      if (!spec.isRepeated && spec.type !== "private") {
        // We only need to attempt to access the state cell to trigger initialization,
        // Check create$StateProxy for more details on how this works.
        getStateCellFrom$StateRoot($state, spec.pathObj as ObjectPath);
      }
    });
  }, []);

  // Re-render if any value changed in one of these objects
  useSnapshot($$state.stateValues, { sync: true });
  return $state;
}

export default useDollarState;
