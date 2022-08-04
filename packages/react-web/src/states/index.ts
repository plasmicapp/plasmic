/* eslint-disable @typescript-eslint/no-use-before-define */
import get from "dlv";
import { dset as set } from "dset";
import React from "react";

type InitFunc<T> = ($props: Record<string, any>, $state: $State) => T;

export interface $State {
  [key: string]: any;
  registerInitFunc: (path: string, f: InitFunc<any>) => any;
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

const UNINITIALIZED = Symbol("plasmic.unitialized");

interface Internal$StateSpec<T> {
  path: string[]; // ["counter", "[]", "count"]
  pathStr: string; // "counter[].count"
  initFunc?: InitFunc<T>;
  initVal?: T;
  valueProp?: string;
  onChangeProp?: string;
  isRepeated: boolean;
}

interface Internal$StateInstance {
  path: (string | number)[]; // ["counter", 0, "count"]
  specKey: string;
}

interface Internal$State {
  stateValues: Record<string, any>;
  initStateValues: Record<string, any>;
  // from path with an initFunc, to the state paths that it uses
  // in the initFunc
  initStateDeps: Record<string, string[]>;
  states: Record<string, Internal$StateInstance>;
  specs: Record<string, Internal$StateSpec<any>>;
}

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

const isNum = (value: string | number | symbol) =>
  typeof value === "symbol" ? false : !isNaN(+value);

function mkProxy(
  specs: Record<string, Internal$StateSpec<any>>,
  maybeHandlers?: (state: Internal$StateInstance) => ProxyHandler<any>
): Record<string, any> {
  const handlers =
    maybeHandlers ??
    ((): ProxyHandler<any> => ({
      get: (target, property) => {
        return target[property];
      },
      set: (target, property, value) => {
        return (target[property] = value) || true;
      },
    }));

  const getNextParts = (currPath: (string | number)[]) =>
    Object.fromEntries(
      Object.values(specs)
        .filter((spec) =>
          shallowEqual(
            currPath.map((p) => (isNum(p) ? "[]" : p)),
            spec.path.slice(0, currPath.length)
          )
        )
        .map((spec) => {
          const nextPart = spec.path[currPath.length];
          if (spec.path.length === currPath.length + 1) {
            return [nextPart, { isLast: true, specKey: spec.pathStr }];
          } else {
            return [nextPart, { isLast: false, specKey: spec.pathStr }];
          }
        })
    );

  /**
   * We use this function when we're setting a value in the middle of the state path.
   * We can't just set the value, because we need to keep the proxy properties, so
   * we use the specs to walk through the object and just set the value in the end of the path
   **/
  const cloneValue = (
    target: Record<string, any>,
    currPath: (string | number)[],
    value: Record<string, any>
  ) => {
    if (typeof value !== "object") {
      return;
    }
    const nextParts = getNextParts(currPath);
    for (const [nextPart, { isLast, specKey }] of Object.entries(nextParts)) {
      if (nextPart === "[]" && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          cloneValue(target[i], [...currPath, i], value[i]);
        }
      } else if (nextPart in value) {
        if (isLast) {
          handlers?.({
            specKey,
            path: [...currPath, nextPart],
          }).set?.(target, nextPart, value[nextPart], undefined);
        } else {
          cloneValue(
            target[nextPart],
            [...currPath, nextPart],
            value[nextPart]
          );
        }
      }
    }
  };
  const rec = (currPath: (string | number)[]) => {
    const nextParts = getNextParts(currPath);
    return new Proxy("[]" in nextParts ? ([] as any) : ({} as any), {
      deleteProperty(target, property) {
        if ("[]" in nextParts && isNum(property as string)) {
          delete target[property];
          handlers?.({
            path: [...currPath, +(property as string)],
            specKey: nextParts["[]"].specKey,
          }).deleteProperty?.(target, property);
        } else {
          throw new Error(
            "You can't delete a non-repeated property in the middle of the path"
          );
        }
        return true;
      },
      get: (target, property, receiver) => {
        if ("[]" in nextParts && isNum(property as string)) {
          if (!(property in target)) {
            target[property] = rec([...currPath, +(property as string)]);
          }
        } else if (property in nextParts) {
          if (nextParts[property as string].isLast) {
            return (target[property] = handlers?.({
              path: [...currPath, property as string],
              specKey: nextParts[property as string].specKey,
            }).get?.(target, property, receiver));
          } else if (!(property in target)) {
            target[property] = rec([...currPath, property as string]);
          }
        }
        return target[property];
      },
      set: (target, property, value, receiver) => {
        if ("[]" in nextParts && isNum(property as string)) {
          if (!(property in target)) {
            target[property] = rec([...currPath, +(property as string)]);
          }
        } else if (property in nextParts) {
          if (nextParts[property as string].isLast) {
            target[property] = value;
            return (
              handlers({
                path: [...currPath, property as string],
                specKey: nextParts[property as string].specKey,
              }).set?.(target, property, value, receiver) ?? false
            );
          }
        }
        if (property === "registerInitFunc") {
          target[property] = value;
        } else if (typeof value === "object") {
          cloneValue(
            target[property],
            [
              ...currPath,
              isNum(property) ? +(property as string) : (property as string),
            ],
            value
          );
        }
        return true;
      },
    });
  };

  return rec([]);
}

function cloneProxy(
  specs: Record<string, Internal$StateSpec<any>>,
  states: Record<string, Internal$StateInstance>,
  obj: Record<string, any>
) {
  const newObj = mkProxy(specs);
  Object.values(states).forEach(({ path }) => {
    set(newObj, path, get(obj, path));
  });
  return newObj;
}

function saveState(
  state: Internal$StateInstance,
  states: Record<string, Internal$StateInstance>
) {
  states[JSON.stringify(state.path)] = state;
}

function hasState(
  state: Internal$StateInstance,
  states: Record<string, Internal$StateInstance>
) {
  return JSON.stringify(state.path) in states;
}

const transformPathStringToObj = (str: string) => {
  // "c[][]" -> ["c", "[]", "[]"]
  const splitStatePathPart = (state: string): string[] =>
    state.endsWith("[]")
      ? [...splitStatePathPart(state.slice(0, -2)), "[]"]
      : [state];
  return str.split(".").flatMap(splitStatePathPart);
};

function useVanillaDollarState(
  _specs: $StateSpec<any>[],
  props: Record<string, any>
) {
  const forceRender = React.useState(0)[1];
  const $$state = React.useMemo<Internal$State>(() => {
    const specs = Object.fromEntries(
      _specs.map(({ path: pathStr, ...spec }) => [
        pathStr,
        {
          ...spec,
          pathStr,
          path: transformPathStringToObj(pathStr),
          isRepeated: pathStr.split(".").some((part) => part.endsWith("[]")),
        },
      ])
    );
    return {
      stateValues: mkProxy(specs),
      initStateDeps: {},
      initStateValues: mkProxy(specs),
      states: {},
      specs,
    };
  }, []);

  const $state: $State = Object.assign(
    mkProxy($$state.specs, (state) => ({
      deleteProperty(_target, _property) {
        const prefixPath = state.path;
        for (const [key, existingState] of Object.entries($$state.states)) {
          if (
            existingState.path.length >= prefixPath.length &&
            shallowEqual(
              existingState.path.slice(0, prefixPath.length),
              prefixPath
            )
          ) {
            delete $$state.states[key];
          }
        }
        forceRender((r) => r + 1);
        return true;
      },
      get(_target, _property) {
        const spec = $$state.specs[state.specKey];
        if (spec.valueProp) {
          if (!spec.isRepeated) {
            return props[spec.valueProp];
          } else {
            return get(props[spec.valueProp], state.path.slice(1));
          }
        }
        if (!hasState(state, $$state.states)) {
          saveState(state, $$state.states);
          set(
            $$state.stateValues,
            state.path,
            spec.initFunc ? UNINITIALIZED : spec.initVal ?? undefined
          );
          const deps = spec.initFunc
            ? fillUninitializedStateValues(
                $$state.specs,
                props,
                $$state.stateValues,
                $$state.states
              )
            : {};
          set(
            $$state.initStateValues,
            state.path,
            get($$state.stateValues, state.path)
          );
          $$state.initStateDeps = { ...$$state.initStateDeps, ...deps };
          forceRender((r) => r + 1);
          return spec.initFunc ? spec.initFunc(props, $state) : spec.initVal;
        }
        return get($$state.stateValues, state.path);
      },
      set(_target, _property, newValue) {
        if (newValue !== get($$state.stateValues, state.path)) {
          saveState(state, $$state.states);
          set($$state.stateValues, state.path, newValue);
          for (const [key, deps] of Object.entries($$state.initStateDeps)) {
            if (deps.includes(JSON.stringify(state.path))) {
              set($$state.stateValues, JSON.parse(key), UNINITIALIZED);
            }
          }
          const newDeps = fillUninitializedStateValues(
            $$state.specs,
            props,
            $$state.stateValues,
            $$state.states
          );
          $$state.initStateDeps = { ...$$state.initStateDeps, ...newDeps };
          forceRender((r) => r + 1);
        }
        const spec = $$state.specs[state.specKey];
        if (spec.onChangeProp) {
          props[spec.onChangeProp]?.(newValue, state.path);
        }
        return true;
      },
    })),
    {
      registerInitFunc: function <T>(pathStr: string, f: InitFunc<T>) {
        if (
          Object.values($$state.states)
            .filter(({ specKey }) => specKey === pathStr)
            .some(
              ({ path }) => get($$state.stateValues, path) !== f(props, $state)
            )
        ) {
          $$state.specs[pathStr] = {
            ...$$state.specs[pathStr],
            initFunc: f,
          };
          forceRender((r) => r + 1);
        }
      },
    }
  );

  // For each spec with an initFunc, evaluate it and see if
  // the init value has changed. If so, reset its state.
  let newStateValues: Record<string, any> | undefined = undefined;
  const resetSpecs: Internal$StateInstance[] = [];
  for (const { path, specKey } of Object.values($$state.states)) {
    const spec = $$state.specs[specKey];
    if (spec.initFunc) {
      const newInit = spec.initFunc(props, $state);
      if (newInit !== get($$state.initStateValues, path)) {
        console.log(
          `init changed for ${JSON.stringify(path)} from ${get(
            $$state.initStateValues,
            path
          )} to ${newInit}; resetting state`
        );
        resetSpecs.push({ path, specKey });
        if (!newStateValues) {
          newStateValues = cloneProxy(
            $$state.specs,
            $$state.states,
            $$state.stateValues
          );
        }
        set(newStateValues, path, UNINITIALIZED);
      }
    }
  }
  React.useLayoutEffect(() => {
    if (newStateValues !== undefined) {
      const newDeps = fillUninitializedStateValues(
        $$state.specs,
        props,
        newStateValues,
        $$state.states
      );
      const initStateValues = cloneProxy(
        $$state.specs,
        $$state.states,
        $$state.initStateValues
      );
      resetSpecs.forEach(({ path }) => {
        set(initStateValues, path, get(newStateValues!, path));
      });
      $$state.stateValues = cloneProxy(
        $$state.specs,
        $$state.states,
        newStateValues!
      );
      $$state.initStateValues = initStateValues;
      $$state.initStateDeps = { ...$$state.initStateDeps, ...newDeps };
      forceRender((r) => r + 1);
      for (const { path, specKey } of resetSpecs) {
        const spec = $$state.specs[specKey];
        if (spec.onChangeProp) {
          console.log(
            `Firing onChange for reset init value: ${spec.path}`,
            get(newStateValues, path)
          );
          props[spec.onChangeProp]?.(get(newStateValues, path));
        }
      }
    }
  }, [newStateValues, props, resetSpecs, $$state.specs]);

  /* *
   * Initialize all known states. (we need to do it for repeated states
   * because they're created only after the first get/set operation)
   * If we don't initialize them, we won't be able to consume the repeated states properly.
   * For example, let's say the consumer is just mapping the repeated states. The first operation
   * is to get the length of the array which will always be 0 because the existing states
   * weren't allocated yet -- they're only stored in internal state)
   * */
  for (const { path } of Object.values($$state.states)) {
    get($state, path);
  }
  return $state;
}

function fillUninitializedStateValues(
  specs: Record<string, Internal$StateSpec<any>>,
  props: Record<string, any>,
  stateValues: Record<string, any>,
  states: Record<string, Internal$StateInstance>
) {
  const stateAccessStack: Set<string>[] = [new Set()];
  const initFuncDeps: Record<string, string[]> = {};
  const $state: $State = Object.assign(
    mkProxy(specs, (state) => ({
      get(_target, _property) {
        const spec = specs[state.specKey];
        if (spec.valueProp) {
          if (!spec.isRepeated) {
            return props[spec.valueProp];
          } else {
            return get(props[spec.valueProp], state.path.slice(1));
          }
        }
        let value = get(stateValues, state.path);
        if (value === UNINITIALIZED) {
          // This value has a init expression; need to be evaluated.
          value = tracked(state);
          set(stateValues, state.path, value);
        }
        // Record that this field had just been accessed; for
        // trackInit() to know what fields were used to compute
        // the init value
        stateAccessStack[stateAccessStack.length - 1].add(
          JSON.stringify(state.path)
        );
        return value;
      },
      set() {
        throw new Error(`Cannot update state values during initialization`);
      },
    })),
    { registerInitFunc: () => {} }
  );

  function tracked(state: Internal$StateInstance) {
    stateAccessStack.push(new Set());
    const res = specs[state.specKey].initFunc!(props, $state);
    const deps = stateAccessStack.pop()!;
    initFuncDeps[JSON.stringify(state.path)] = [...deps.values()];
    return res;
  }
  for (const { path } of Object.values(states)) {
    if (get(stateValues, path) === UNINITIALIZED) {
      get($state, path);
    }
  }
  return initFuncDeps;
}

export default useVanillaDollarState;
