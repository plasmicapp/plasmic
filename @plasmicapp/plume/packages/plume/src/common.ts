import * as React from 'react';
import {
  Renderer,
  SingleChoiceArg,
  Flex,
  Overrides,
} from '@plasmicapp/react-web';
import fromPairs from 'lodash-es/fromPairs';
import groupBy from 'lodash-es/groupBy';
import mapValues from 'lodash-es/mapValues';

export interface StyleProps {
  className?: string;
  style?: React.CSSProperties;
}

export type AnyRenderer = Renderer<any, any, any, any>;

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

export type RendererVariants<R extends AnyRenderer> = R extends Renderer<
  infer V,
  any,
  any,
  any
>
  ? V
  : unknown;
export type RendererArgs<R extends AnyRenderer> = R extends Renderer<
  any,
  infer A,
  any,
  any
>
  ? A
  : unknown;
export type RendererOverrides<R extends AnyRenderer> = R extends Renderer<
  any,
  any,
  infer O,
  any
>
  ? O
  : unknown;

export type PlasmicClass<R extends AnyRenderer> = {
  createRenderer: () => R;
};

export function mergeVariantDefTuples<V>(
  defs: (undefined | false | null | React.ReactChild | VariantDefTuple<V>)[]
) {
  const grouped = groupBy(
    defs.filter((x): x is VariantDefTuple<V> => !!x),
    ([group, variant]) => group
  );
  return mapValues(grouped, (value) => {
    if (value.length === 1) {
      return value[0][1];
    } else {
      return value.map((v) => v[1]);
    }
  });
}

export function mergeProps<P1>(p1: P1): P1;
export function mergeProps<P1, P2>(p1: P1, p2: P2): P1 & P2;
export function mergeProps<P1, P2, P3>(p1: P1, p2: P2, p3: P3): P1 & P2 & P3;
export function mergeProps<P1, P2, P3, P4>(
  p1: P1,
  p2: P2,
  p3: P3,
  p4: P4
): P1 & P2 & P3 & P4;
export function mergeProps(
  props: Record<string, any>,
  ...restProps: Record<string, any>[]
): Record<string, any> {
  const result = { ...props };

  for (const rest of restProps) {
    for (const key of Object.keys(rest)) {
      result[key] = mergePropVals(key, result[key], rest[key]);
    }
  }

  return result;
}

function mergePropVals(name: string, defaultVal: any, overrideVal: any): any {
  if (defaultVal == null) {
    // Always prefer the non-null value
    return overrideVal;
  } else if (overrideVal == null) {
    return defaultVal;
  } else if (
    typeof defaultVal === 'function' &&
    typeof overrideVal === 'function'
  ) {
    return (...args: any[]) => {
      defaultVal(...args);
      return overrideVal(...args);
    };
  } else if (name === 'className') {
    return `${defaultVal || ''} ${overrideVal || ''}`;
  } else if (name === 'style') {
    return {
      ...(defaultVal || {}),
      ...(overrideVal || {}),
    };
  } else {
    // Else we always let override win.
    return overrideVal;
  }
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

  if (typeof ref === 'function') {
    ref(value);
  } else {
    if (!Object.isFrozen(ref)) {
      (ref as React.MutableRefObject<T | null>).current = value;
    }
  }
}
