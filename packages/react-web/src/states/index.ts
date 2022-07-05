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

export function keyBy<K extends string, V>(list: V[], keyFunc: (v: V) => K) {
  const keyedObject: Record<K, V> = {} as Record<K, V>;
  for (const val of list) {
    keyedObject[keyFunc(val)] = val;
  }
  return keyedObject;
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

function isRendering() {
  return !!(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    .ReactCurrentOwner.current;
}

interface Internal$State {
  stateValues: Record<string, any>;
  initStateValues: Record<string, any>;
  // from path with an initFunc, to the state paths that it uses
  // in the initFunc
  initStateDeps: Record<string, string[]>;
  // When a state value changes, we need to fire the corresponding
  // onChange listener. However, we _cannot_ do this at rendering
  // time, as it is illegal to set the state of some other component
  // when rendering this component. Instead, we must save this in
  // a state and then fire it in an effect.
  fireOnChange: Record<string, any>;
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

function useVanillaDollarState(
  specs: $StateSpec<any>[],
  props: Record<string, any>
) {
  const [_$$state, set$$State] = React.useState<Internal$State>(() => ({
    stateValues: Object.fromEntries(
      specs.map((spec) => [
        spec.path,
        // If the initial value depends on initFunc, then we initialize
        // it to this special UNINITIALIZED symbol. We can't just run
        // spec.initFunc() here, because the expression may read from
        // $state, which is not yet initialized.  Instead, we will
        // lazily compute and initialize this at get() time.
        spec.initFunc ? UNINITIALIZED : spec.initVal,
      ])
    ),
    initStateValues: Object.fromEntries(
      specs
        .filter((spec) => !spec.initFunc)
        .map((spec) => [spec.path, spec.initVal])
    ),
    initStateDeps: {},
    fireOnChange: {},
  }));

  // We have a weird scheme here to reduce the number of state updates.
  // Whenever user does a $state get() or set(), we may end up initializing
  // a bunch of values. We don't want to call set$$State() a bunch of times.
  // Instead, we will fork as we need to, and call set$$State() at the end of
  // the hook and at the end of get() / set() as appropriate.
  // $$state here is going to be copied-on-write; once copied, it will
  // be directly mutated. Since $state will always be directly proxying $$state,
  // that means you can "read what you wrote": after $state.count = $state.count + 1,
  // if you read $state.count again, it will reflect the latest value.
  //
  // There are three places where we might actually call set$$State():
  // 1. At the end of a "top-level" get(): we may have ended up initializing
  //    some state values.
  // 2. At the end of a "top-level" set(): we mutated this value, but also
  //    may have reset some other state values that depended on this one.
  // 3. At the end of the hook, where we compare the new initial value with
  //    the previous initial value.
  const $$state = { ..._$$state };
  const dirtyFields = {
    stateValues: false,
    initStateValues: false,
    initStateDeps: false,
    fireOnChange: false,
  };

  function makeDirty(
    field: keyof typeof dirtyFields,
    copy: (orig: any) => any
  ) {
    if (!dirtyFields[field]) {
      dirtyFields[field] = true;
      $$state[field] = copy($$state[field]);
    }
  }

  function updateStateValue(path: string, value: any) {
    makeDirty("stateValues", (x) => ({ ...x }));
    console.log("UPDATE state value:", path, value);
    $$state.stateValues[path] = value;

    // If any other state depends on this one, then reset their
    // values to their initial as well
    for (const [key, deps] of Object.entries($$state.initStateDeps)) {
      if (deps.includes(path)) {
        resetPath(key);
      }
    }

    const spec = specByPath[path];
    if (spec.onChangeProp) {
      if (isRendering()) {
        // If we're currently rendering this component, then we
        // CANNOT fire the event handler, as it is illegal to set
        // the state of another component during rendering.
        // Instead, we save it into our internal state, and fire
        // it later in a layout effect.
        updateFireOnChange(spec.path, value);
      } else {
        // Most of the time, state changes outside of rendering
        // (in an event handler), and we just directly call the
        // onChange
        props[spec.onChangeProp]?.(value);
      }
    }
  }

  function updateInitStateValue(path: string, value: any) {
    makeDirty("initStateValues", (x) => ({ ...x }));
    console.log("UPDATE initValue:", path, value);
    $$state.initStateValues[path] = value;
  }

  function updateInitStateDeps(path: string, deps: string[]) {
    makeDirty("initStateDeps", (x) => ({ ...x }));
    console.log(`UPDATE DEPS: ${path}`, deps);
    $$state.initStateDeps[path] = deps;
  }

  function updateInternalStateIfDirty() {
    if (Object.values(dirtyFields).some((x) => x)) {
      console.log("UPDATE $$STATE");
      set$$State($$state);
    }
  }

  function updateFireOnChange(path: string, value: any) {
    makeDirty("fireOnChange", (x) => ({ ...x }));
    $$state.fireOnChange[path] = value;
  }

  console.log(`useDollarState`, { ..._$$state });
  const specByPath = React.useMemo(() => keyBy(specs, (spec) => spec.path), [
    specs,
  ]);

  const stateAccessStack: Record<string, boolean>[] = [{}];
  const $props = props;

  /**
   * Runs spec.initFunc, keeping track of the state accesses
   * that occurred while running it
   */
  function trackedInit<T>(spec: $StateSpec<T>): T {
    const stateAccess: Record<string, boolean> = {};
    stateAccessStack.push(stateAccess);
    const res = spec.initFunc!($props, $state);
    const deps = Object.keys(stateAccess);
    if (!shallowEqual(deps, $$state.initStateDeps[spec.path] ?? [])) {
      updateInitStateDeps(spec.path, deps);
    }
    stateAccessStack.pop();
    return res;
  }

  /**
   * Resets the value for this state
   */
  function resetPath(path: string) {
    // Resets the value for this state
    const spec = specByPath[path];
    const initValue = trackedInit(spec);
    if (initValue !== $$state.stateValues[spec.path]) {
      updateStateValue(spec.path, initValue);
    }
    if (initValue !== $$state.initStateValues[spec.path]) {
      updateInitStateValue(spec.path, initValue);
    }
    return initValue;
  }

  // Since a get() or a set() may result in other get() or set(),
  // we keep track of whether we're at the "top-level" so we know
  // whether to update state at the end.
  let accessLevel = 0;

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
        }
        accessLevel += 1;
        let value = $$state.stateValues[spec.path];
        if (value === UNINITIALIZED) {
          // This value has a init expression; need to be evaluated.
          value = resetPath(spec.path);
        }
        // Record that this field had just been accessed; for
        // trackInit() to know what fields were used to compute
        // the init value
        stateAccessStack[stateAccessStack.length - 1][spec.path] = true;
        accessLevel -= 1;
        if (accessLevel === 0) {
          updateInternalStateIfDirty();
        }
        return value;
      },
      set(newValue) {
        accessLevel += 1;
        if (newValue !== $$state.stateValues[spec.path]) {
          updateStateValue(spec.path, newValue);
        }
        accessLevel -= 1;
        if (accessLevel === 0) {
          updateInternalStateIfDirty();
        }
      },
    });
  }

  // For each spec with an initFunc, evaluate it and see if
  // the init value has changed. If so, reset its state.
  for (const spec of specs) {
    if (spec.initFunc) {
      const newInit = spec.initFunc($props, $state);
      if (newInit !== $$state.initStateValues[spec.path]) {
        console.log(
          `init changed for ${spec.path} from ${
            $$state.initStateValues[spec.path]
          } to ${newInit}; resetting state`
        );
        updateInitStateValue(spec.path, newInit);
        updateStateValue(spec.path, newInit);
        if (spec.onChangeProp) {
          updateFireOnChange(spec.path, newInit);
        }
      }
    }
  }

  const fireOnChange = $$state.fireOnChange;
  React.useLayoutEffect(() => {
    if (Object.keys(fireOnChange).length > 0) {
      for (const [path, value] of Object.entries(fireOnChange)) {
        const spec = specByPath[path];
        if (spec.onChangeProp) {
          props[spec.onChangeProp]?.(value);
        }
      }
      set$$State((prev) => ({
        ...prev,
        fireOnChange: {},
      }));
    }
  }, [fireOnChange, props, specByPath]);

  // update state if the above did some writes.
  updateInternalStateIfDirty();
  return $state;
}

const useDollarState = useVanillaDollarState;

export default useDollarState;
