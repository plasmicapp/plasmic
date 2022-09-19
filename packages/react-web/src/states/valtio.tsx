import get from "dlv";
import deepEqual from "fast-deep-equal";
import React from "react";
import { proxy as createValtioProxy, ref, useSnapshot } from "valtio";
import { subscribeKey } from "valtio/utils";
import { set } from "./helpers";

const mkUntrackedValue = (o: any) => (typeof o === "object" ? ref(o) : o);

type InitFunc<T> = (
  $props: Record<string, any>,
  $state: $State,
  indexes: number[]
) => T;
type ObjectPath = (string | number)[];

export interface $State {
  [key: string]: any;
  registerInitFunc?: (path: string, f: InitFunc<any>) => any;
}

interface Internal$StateSpec<T> extends $StateSpec<T> {
  isRepeated: boolean;
  pathObj: ObjectPath;
}

interface Internal$StateInstance {
  path: ObjectPath; // ["counter", 0, "count"]
  specKey: string;
}

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
}

interface Internal$State {
  stateValues: Record<string, any>;
  initStateValues: Record<string, any>;
  unsubscriptionsByState: Record<string, (() => void)[]>;
  specsByKey: Record<string, Internal$StateSpec<any>>;
  statesInstanceBySpec: Map<string, Internal$StateInstance[]>;
  existingStates: Map<string, Internal$StateInstance>;
  registrationsQueue: { pathStr: string; f: InitFunc<any> }[];
  props: any;
}

const transformPathStringToObj = (str: string) => {
  const splitStatePathPart = (state: string): string[] =>
    state.endsWith("[]")
      ? [...splitStatePathPart(state.slice(0, -2)), "[]"]
      : [state];
  return str.split(".").flatMap(splitStatePathPart);
};

function shallowEqual<T>(a1: T[], a2: T[]) {
  if (a1.length !== a2.length) {
    return false;
  }
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] !== a2[i]) {
      return false;
    }
  }
  return true;
}

function isNum(value: string | number | symbol): value is number {
  return typeof value === "symbol" ? false : !isNaN(+value);
}

function saveNewState<T>(
  $$state: Internal$State,
  path: ObjectPath,
  spec: Internal$StateSpec<T>
) {
  const key = JSON.stringify(path);
  $$state.existingStates.set(key, { path, specKey: spec.path });
  if (!$$state.statesInstanceBySpec.has(spec.path)) {
    $$state.statesInstanceBySpec.set(spec.path, []);
  }
  $$state.statesInstanceBySpec
    .get(spec.path)!
    .push({ path, specKey: spec.path });
}

function create$StateProxy(
  $$state: Internal$State,
  handlers: (
    path: ObjectPath,
    spec: Internal$StateSpec<any>
  ) => ProxyHandler<any>
) {
  const getNextKeyToSpecMap = (currPath: ObjectPath) =>
    new Map(
      Object.entries(
        Object.values($$state.specsByKey)
          .filter((spec) =>
            shallowEqual(
              currPath.map((p) => (isNum(p) ? "[]" : p)),
              spec.pathObj.slice(0, currPath.length)
            )
          )
          .reduce((agg, spec) => {
            const nextKey = spec.pathObj[currPath.length];
            if (!(nextKey in agg)) {
              agg[nextKey] = [];
            }
            agg[nextKey].push(spec);
            return agg;
          }, {} as Record<string, Internal$StateSpec<any>[]>)
      )
    );
  const rec = (currPath: ObjectPath) => {
    const nextKeyToSpecs = getNextKeyToSpecMap(currPath);
    const getSpecForProperty = (property: string | number | symbol) => {
      return nextKeyToSpecs.has("[]") && isNum(property)
        ? nextKeyToSpecs.get("[]")?.[0]
        : typeof property === "string" && nextKeyToSpecs.has(property)
        ? nextKeyToSpecs.get(property)?.[0]
        : undefined;
    };
    const getNextPath = (property: string | number | symbol) => [
      ...currPath,
      isNum(property) ? +property : (property as string),
    ];

    return new Proxy(nextKeyToSpecs.has("[]") ? ([] as any) : ({} as any), {
      deleteProperty(target, property) {
        const prefixPath = getNextPath(property);
        const specKeysToUpdate = new Set<string>();
        $$state.existingStates.forEach(({ path, specKey }) => {
          if (
            path.length >= prefixPath.length &&
            shallowEqual(path.slice(0, prefixPath.length), prefixPath)
          ) {
            deleteState($$state, path);
            specKeysToUpdate.add(specKey);
          }
        });
        specKeysToUpdate.forEach((specKey) => {
          const spec = $$state.specsByKey[specKey];
          if (spec.onChangeProp) {
            $$state.props[spec.onChangeProp]?.(
              get($$state.stateValues, currPath),
              currPath
            );
          }
        });
        return Reflect.deleteProperty(target, property);
      },
      get(target, property, receiver) {
        const spec = getSpecForProperty(property);
        if (spec && typeof property !== "symbol") {
          const nextPath = getNextPath(property);
          if (spec.pathObj.length === currPath.length + 1) {
            // reached the end of the spec
            target[property] = handlers(nextPath, spec).get?.(
              target,
              property,
              receiver
            );
          } else if (!(property in target)) {
            target[property] = rec(nextPath);
          }
        }
        return Reflect.get(target, property, receiver);
      },
      set(target, property, value, receiver) {
        const spec = getSpecForProperty(property);
        const nextPath = getNextPath(property);
        if (spec && typeof property !== "symbol") {
          if (spec.pathObj.length === currPath.length + 1) {
            // reached the end of the spec
            target[property] = handlers(nextPath, spec).set?.(
              target,
              property,
              value,
              receiver
            );
            return Reflect.set(target, property, value, receiver);
          } else if (typeof value === "object") {
            target[property] = rec(nextPath);
            for (const key of Object.keys(value)) {
              target[property][key] = value[key];
            }
            return true;
          }
        }
        if (property === "registerInitFunc" && currPath.length === 0) {
          return Reflect.set(target, property, value, receiver);
        }
        if (nextKeyToSpecs.has("[]")) {
          set($$state.stateValues, nextPath, value);
          nextKeyToSpecs.get("[]")?.forEach((spec) => {
            if (spec?.onChangeProp) {
              $$state.props[spec.onChangeProp]?.(value, nextPath);
            }
          });
          return Reflect.set(target, property, value, receiver);
        }
        // invalid setting a value that doesn't make part of the spec
        return false;
      },
    });
  };

  return rec([]);
}

const deleteState = ($$state: Internal$State, path: ObjectPath) => {
  const key = JSON.stringify(path);
  $$state.unsubscriptionsByState[key]?.forEach((f: any) => f());
  delete $$state.unsubscriptionsByState[key];
  $$state.existingStates.delete(key);

  // delete get($$state.stateValues, path.slice(-1))[path.slice(-1)[0]];
  // delete get($$state.initStateValues, path.slice(-1))[path.slice(-1)[0]];
};

const getIndexes = (path: ObjectPath, spec: Internal$StateSpec<any>) => {
  const indexes = [];
  if (path.length !== spec.pathObj.length) {
    throw new Error(
      "Unexpected error: state path and spec path have different lengths"
    );
  }
  for (let i = 0; i < spec.pathObj.length; i++) {
    if (spec.pathObj[i] === "[]") {
      indexes.push(path[i] as number);
    }
  }
  return indexes;
};

function initializeStateValue(
  $$state: Internal$State,
  initialStatePath: ObjectPath,
  initialSpec: Internal$StateSpec<any>
) {
  const initialStateKey = JSON.stringify(initialStatePath);
  const stateAccess: Set<{
    path: ObjectPath;
    spec: Internal$StateSpec<any>;
  }> = new Set();
  const $state = create$StateProxy($$state, (path, spec) => ({
    get() {
      const key = JSON.stringify(path);
      stateAccess.add({ path, spec });
      if (spec.valueProp) {
        return !spec.isRepeated
          ? $$state.props[spec.valueProp]
          : get($$state.props[spec.valueProp], path.slice(1));
      }
      if ($$state.existingStates.has(key)) {
        // is already initialized
        return get($$state.stateValues, path);
      } else if (spec.initFunc) {
        initializeStateValue($$state, path, spec);
      }
      return get($$state.stateValues, path);
    },
    set() {
      throw new Error(`Cannot update state values during initialization`);
    },
  }));

  $$state.unsubscriptionsByState[initialStateKey]?.forEach((f: any) => f());
  $$state.unsubscriptionsByState[initialStateKey] = [];
  stateAccess.forEach(({ path, spec }) => {
    const unsubscribe = subscribeKey(
      get($$state.stateValues, path.slice(-1)),
      path.slice(-1)[0],
      () =>
        set(
          $$state.stateValues,
          initialStatePath,
          mkUntrackedValue(
            initialSpec.initFunc!($$state.props, $state, getIndexes(path, spec))
          )
        )
    );
    $$state.unsubscriptionsByState[initialStateKey].push(unsubscribe);
  });

  const untrackedInitialValue = mkUntrackedValue(
    initialSpec.initFunc!(
      $$state.props,
      $state,
      getIndexes(initialStatePath, initialSpec)
    )
  );
  set($$state.initStateValues, initialStatePath, untrackedInitialValue);
  set($$state.stateValues, initialStatePath, untrackedInitialValue);
  return untrackedInitialValue;
}

export function useDollarState(
  specs: $StateSpec<any>[],
  props: Record<string, any>
) {
  const $$state = React.useRef(
    createValtioProxy<Internal$State>({
      stateValues: {},
      initStateValues: {},
      specsByKey: Object.fromEntries(
        specs.map((spec) => [
          spec.path,
          {
            ...spec,
            pathObj: transformPathStringToObj(spec.path),
            isRepeated: spec.path
              .split(".")
              .some((part) => part.endsWith("[]")),
          },
        ])
      ),
      statesInstanceBySpec: new Map<string, Internal$StateInstance[]>(),
      existingStates: new Map<string, Internal$StateInstance>(),
      unsubscriptionsByState: {},
      props: undefined,
      registrationsQueue: [],
    })
  ).current;
  $$state.props = mkUntrackedValue(props);

  const $state = React.useRef(
    Object.assign(
      create$StateProxy($$state, (path, spec) => {
        const key = JSON.stringify(path);
        if (!$$state.existingStates.has(key)) {
          saveNewState($$state, path, spec);
          const untrackedValue = !spec.initFunc
            ? mkUntrackedValue(spec.initVal ?? undefined)
            : initializeStateValue($$state, path, spec);
          set($$state.stateValues, path, untrackedValue);
          set($$state.initStateValues, path, untrackedValue);
        }
        return {
          get() {
            if (spec.valueProp) {
              const value = !spec.isRepeated
                ? $$state.props[spec.valueProp]
                : get($$state.props[spec.valueProp], path.slice(1));
              return value;
            } else {
              return get($$state.stateValues, path);
            }
          },
          set(_t, _p, value) {
            set($$state.stateValues, path, mkUntrackedValue(value));
            if (spec.onChangeProp) {
              $$state.props[spec.onChangeProp]?.(value, path);
            }
            return true;
          },
        };
      }),
      {
        registerInitFunc: function <T>(pathStr: string, f: InitFunc<T>) {
          if (
            $$state.statesInstanceBySpec
              .get(pathStr)
              ?.some(
                ({ path, specKey }) =>
                  !deepEqual(
                    get($$state.initStateValues, path),
                    f(
                      props,
                      $state,
                      getIndexes(path, $$state.specsByKey[specKey])
                    )
                  )
              )
          ) {
            $$state.registrationsQueue.push({ pathStr, f });
          }
        },
      }
    )
  ).current;

  // For each spec with an initFunc, evaluate it and see if
  // the init value has changed. If so, reset its state.
  const resetSpecs: { path: ObjectPath; spec: Internal$StateSpec<any> }[] = [];
  $$state.existingStates.forEach(({ path, specKey }) => {
    const spec = $$state.specsByKey[specKey];
    if (spec.initFunc) {
      const newInit = spec.initFunc(props, $state, getIndexes(path, spec));
      if (!deepEqual(newInit, get($$state.initStateValues, path))) {
        resetSpecs.push({ path, spec });
      }
    }
  });
  React.useLayoutEffect(() => {
    resetSpecs.forEach(({ path, spec }) => {
      const newInit = initializeStateValue($$state, path, spec);
      if (spec.onChangeProp) {
        $$state.props[spec.onChangeProp]?.(newInit, path);
      }
    });
  }, [props, resetSpecs]);
  React.useLayoutEffect(() => {
    $$state.registrationsQueue.forEach(({ f, pathStr }) => {
      $$state.specsByKey[pathStr].initFunc = f;
    });
    $$state.registrationsQueue = [];
  }, [$$state.registrationsQueue]);

  // Re-render if any value changed in one of these objects
  useSnapshot($$state.stateValues, { sync: true });
  useSnapshot($$state.specsByKey, { sync: true });

  return $state;
}

export default useDollarState;

// Simple version of $state useDollarState for read-only
export function useCanvasDollarState(
  specs: $StateSpec<any>[],
  props: Record<string, any>
) {
  const $$state = createValtioProxy<Internal$State>({
    stateValues: {},
    initStateValues: {},
    specsByKey: Object.fromEntries(
      specs.map((spec) => [
        spec.path,
        {
          ...spec,
          pathObj: transformPathStringToObj(spec.path),
          isRepeated: spec.path.split(".").some((part) => part.endsWith("[]")),
        },
      ])
    ),
    statesInstanceBySpec: new Map<string, Internal$StateInstance[]>(),
    existingStates: new Map<string, Internal$StateInstance>(),
    unsubscriptionsByState: {},
    props: undefined,
    registrationsQueue: [],
  });
  $$state.props = mkUntrackedValue(props);

  const $state = create$StateProxy($$state, (path, spec) => {
    return {
      get() {
        return get($$state.stateValues, path);
      },
      set(_t, _p, value) {
        set($$state.stateValues, path, mkUntrackedValue(value));
        if (spec.onChangeProp) {
          $$state.props[spec.onChangeProp]?.(value, path);
        }
        return true;
      },
    };
  });
  for (const spec of specs) {
    const path = transformPathStringToObj(spec.path);
    const init = spec.valueProp
      ? $$state.props[spec.valueProp]
      : spec.initVal
      ? spec.initVal
      : spec.initFunc
      ? initializeStateValue($$state, path, $$state.specsByKey[spec.path])
      : undefined;
    set($state, path, init);
  }
  return $state;
}
