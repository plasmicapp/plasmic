import * as React from "react";
import { groupBy, mapValues } from "../common";
import { SingleChoiceArg } from "../render/elements";

export let PLUME_STRICT_MODE = true;

export function setPlumeStrictMode(mode: boolean) {
  PLUME_STRICT_MODE = mode;
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

type DistributeTuple<T> = T extends [infer T1, infer T2]
  ? { group: T1; variant: T2 }
  : never;

export type VariantDef<V> = DistributeTuple<VariantDefTuple<V>>;

export type PlasmicClass<
  V extends Record<string, any>,
  A extends Record<string, any>,
  O extends Record<string, any>
> = {
  (props: { variants?: V; args?: A; overrides?: O }): React.ReactNode;
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

type BooleanLike = boolean | undefined | null;

export function mergeVariantToggles<V>(
  ...toggles: { def?: VariantDef<V>; active: BooleanLike }[]
) {
  const definedToggles = toggles.filter((x) => !!x.def) as {
    def: VariantDef<V>;
    active: BooleanLike;
  }[];
  const grouped = groupBy(definedToggles, ({ def }) => def.group as string);
  return mapValues(grouped, (subToggles) => {
    return Object.fromEntries(
      subToggles.map(({ def, active }) => [def.variant, !!active])
    );
  });
}

export function noOutline() {
  return { outline: "none" };
}

export function getPlumeType(child: React.ReactChild): string | undefined {
  if (!React.isValidElement(child)) {
    return undefined;
  }
  const childType = child.type as any;
  return (childType.__plumeType || childType.getPlumeType?.(child.props)) as
    | string
    | undefined;
}
