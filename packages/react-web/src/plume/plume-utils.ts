import * as React from "react";
import { groupBy, mapValues } from "../common";
import { SingleChoiceArg } from "../render/elements";

export interface StyleProps {
  className?: string;
  style?: React.CSSProperties;
}

type VariantArgChoices<T> = T extends (infer M)[]
  ? M
  : T extends SingleChoiceArg<infer M>
  ? M
  : never;
type VariantArgsChoices<V> = { [k in keyof V]-?: VariantArgChoices<V[k]> };
type DictValues<V extends Record<string, any>> = V[keyof V];
type DictTuples<V extends Record<string, any>> = DictValues<
  { [K in keyof V]: [K, V[K]] }
>;
export type VariantDefTuple<V> = DictTuples<VariantArgsChoices<V>>;

export type PlasmicClass<
  V extends Record<string, any>,
  A extends Record<string, any>,
  O extends Record<string, any>
> = {
  (props: { variants?: V; args?: A; overrides?: O }): React.ReactElement | null;
  internalVariantProps: (keyof V)[];
  internalArgProps: (keyof A)[];
};

export type AnyPlasmicClass = PlasmicClass<any, any, any>;

export type PlasmicClassVariants<
  C extends AnyPlasmicClass
> = C extends PlasmicClass<infer V, any, any> ? V : unknown;
export type PlasmicClassArgs<
  C extends AnyPlasmicClass
> = C extends PlasmicClass<any, infer A, any> ? A : unknown;
export type PlasmicClassOverrides<
  C extends AnyPlasmicClass
> = C extends PlasmicClass<any, any, infer O> ? O : unknown;

export function mergeVariantDefTuples<V>(
  defs: (undefined | false | null | React.ReactChild | VariantDefTuple<V>)[]
) {
  const grouped = groupBy(
    defs.filter((x): x is VariantDefTuple<V> => !!x),
    ([group, _]) => group as string
  );
  return mapValues(grouped, (value) => {
    if (value.length === 1) {
      return value[0][1];
    } else {
      return value.map((v) => v[1]);
    }
  });
}

export function useForwardedRef<T>(ref: React.Ref<T>) {
  const onRef = React.useCallback(
    (x: T) => {
      updateRef(ref, x);
      ensuredRef.current = x;
    },
    [ref]
  );

  const ensuredRef = React.useRef<T | null>(null);
  return { ref: ensuredRef, onRef };
}

function updateRef<T>(ref: React.Ref<T>, value: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
  } else {
    if (!Object.isFrozen(ref)) {
      (ref as React.MutableRefObject<T | null>).current = value;
    }
  }
}

export function noOutline() {
  return { outline: "none" };
}
