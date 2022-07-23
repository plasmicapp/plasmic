/* eslint-disable @typescript-eslint/no-use-before-define */
import get from "dlv";
import { dset as set } from "dset";
import React from "react";

interface $State {
  [key: string]: any;
}

interface $StateSpec<T> {
  // path of the state, like `count` or `list.selectedIndex`
  path: string;
  // if initial value is defined by a js expression
  initFunc?: ($props: Record<string, any>, $state: $State) => T;
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

function pick<T extends object | undefined>(obj: T, ...paths: string[]) {
  const newObj: Record<string, any> = {};
  for (const path of paths) {
    newObj[path] = (obj ?? ({} as any))[path];
  }
  return newObj;
}

function getObjectAtPath($state: $State, path: string) {
  const parts = path.split(".");
  const parts2 = parts.slice(0, parts.length - 1);
  if (parts2.length === 0) {
    return $state;
  }
  const existing = get($state, parts2);
  if (existing) {
    return existing;
  }
  const newObj = {};
  set($state, parts2, newObj);
  return newObj;
}

interface Internal$State {
  stateValues: Record<string, any>;
  initStateValues: Record<string, any>;
  // from path with an initFunc, to the state paths that it uses
  // in the initFunc
  initStateDeps: Record<string, string[]>;
}

function useVanillaDollarState(
  specs: $StateSpec<any>[],
  props: Record<string, any>
) {
  const [$$state, set$$State] = React.useState<Internal$State>(() => {
    const stateValues: Record<string, any> = {};
    for (const spec of specs) {
      if (spec.valueProp) {
        continue;
      } else if (spec.initFunc) {
        stateValues[spec.path] = UNINITIALIZED;
      } else {
        stateValues[spec.path] = spec.initVal ?? undefined;
      }
    }
    const deps = fillUninitializedStateValues(specs, props, stateValues);
    return {
      stateValues,
      initStateDeps: deps,
      initStateValues: { ...stateValues },
    };
  });

  const $state: $State = {};
  for (const spec of specs) {
    const parts = spec.path.split(".");
    const name = parts[parts.length - 1];
    const obj = getObjectAtPath($state, spec.path);
    // Define get() and set() for this state cell
    Object.defineProperty(obj, name, {
      get() {
        if (spec.valueProp) {
          return props[spec.valueProp];
        } else {
          return $$state.stateValues[spec.path];
        }
      },
      set(newValue) {
        if (newValue !== $$state.stateValues[spec.path]) {
          $$state.stateValues[spec.path] = newValue;
          for (const [key, deps] of Object.entries($$state.initStateDeps)) {
            if (deps.includes(spec.path)) {
              $$state.stateValues[key] = UNINITIALIZED;
            }
          }
          const newDeps = fillUninitializedStateValues(
            specs,
            props,
            $$state.stateValues
          );
          set$$State((prev) => ({
            ...prev,
            stateValues: { ...$$state.stateValues },
            initStateDeps: { ...prev.initStateDeps, ...newDeps },
          }));
          if (spec.onChangeProp) {
            props[spec.onChangeProp]?.(newValue);
          }
        }
      },
    });
  }

  // For each spec with an initFunc, evaluate it and see if
  // the init value has changed. If so, reset its state.
  let newStateValues: Record<string, any> | undefined = undefined;
  const resetSpecs: $StateSpec<any>[] = [];
  for (const spec of specs) {
    if (spec.initFunc) {
      const newInit = spec.initFunc(props, $state);
      if (newInit !== $$state.initStateValues[spec.path]) {
        console.log(
          `init changed for ${spec.path} from ${
            $$state.initStateValues[spec.path]
          } to ${newInit}; resetting state`
        );
        resetSpecs.push(spec);
        if (!newStateValues) {
          newStateValues = { ...$$state.stateValues };
        }
        newStateValues[spec.path] = UNINITIALIZED;
      }
    }
  }
  React.useLayoutEffect(() => {
    if (newStateValues !== undefined) {
      const newDeps = fillUninitializedStateValues(
        specs,
        props,
        newStateValues
      );
      set$$State((prev) => ({
        ...prev,
        stateValues: newStateValues!,
        initStateDeps: { ...prev.initStateDeps, ...newDeps },
        initStateValues: {
          ...prev.initStateValues,
          ...pick(newStateValues, ...resetSpecs.map((spec) => spec.path)),
        },
      }));
      for (const spec of resetSpecs) {
        if (spec.onChangeProp) {
          console.log(
            `Firing onChange for reset init value: ${spec.path}`,
            newStateValues[spec.path]
          );
          props[spec.onChangeProp]?.(newStateValues[spec.path]);
        }
      }
    }
  }, [newStateValues, props, resetSpecs, specs]);
  return $state;
}

function fillUninitializedStateValues(
  specs: $StateSpec<any>[],
  props: Record<string, any>,
  stateValues: Record<string, any>
) {
  const $state: $State = {};
  const stateAccessStack: Record<string, boolean>[] = [{}];
  const initFuncDeps: Record<string, string[]> = {};
  function tracked<T>(spec: $StateSpec<T>) {
    stateAccessStack.push({});
    const res = spec.initFunc!(props, $state);
    const deps = Object.keys(stateAccessStack.pop()!);
    initFuncDeps[spec.path] = deps;
    return res;
  }
  for (const spec of specs) {
    const parts = spec.path.split(".");
    const name = parts[parts.length - 1];
    const obj = getObjectAtPath($state, spec.path);
    // Define get() and set() for this state cell
    Object.defineProperty(obj, name, {
      get() {
        if (spec.valueProp) {
          return props[spec.valueProp];
        }
        let value = stateValues[spec.path];
        if (value === UNINITIALIZED) {
          // This value has a init expression; need to be evaluated.
          value = tracked(spec);
          stateValues[spec.path] = value;
        }
        // Record that this field had just been accessed; for
        // trackInit() to know what fields were used to compute
        // the init value
        stateAccessStack[stateAccessStack.length - 1][spec.path] = true;
        return value;
      },
      set() {
        throw new Error(`Cannot update state values during initialization`);
      },
    });
  }
  for (const [key, val] of Object.entries(stateValues)) {
    if (val === UNINITIALIZED) {
      get($state, key);
    }
  }
  return initFuncDeps;
}

export default useVanillaDollarState;
