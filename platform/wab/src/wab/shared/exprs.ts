import { ensure } from "@/wab/shared/common";
import { getCssInitial } from "@/wab/shared/css";
import {
  getCssDefault,
  IRuleSetHelpersX,
  ReadonlyIRuleSetHelpersX,
} from "@/wab/shared/RuleSetHelpers";
import L from "lodash";
import { CSSProperties } from "react";

export interface IBaseRuleSetHelpers {
  has: (prop: string) => boolean;
  getRaw: (prop: string) => string | undefined;
  set: (prop: string, val: string) => void;
  clear: (prop: string) => void;
  props: () => string[];
  getDefault?: (prop: string) => string;
}

export type ReadonlyIBaseRuleSetHelpers = Pick<
  IBaseRuleSetHelpers,
  "has" | "getRaw" | "props" | "getDefault"
>;

export function makeReadonlyExpProxy(
  exp: ReadonlyIRuleSetHelpersX,
  overrides?: Partial<ReadonlyIRuleSetHelpersX>
): ReadonlyIRuleSetHelpersX {
  return Object.assign(
    {},
    {
      has: (prop: string) => exp.has(prop),
      get: (prop: string) => exp.get(prop),
      getRaw: (prop: string) => exp.getRaw(prop),
      props: () => exp.props(),
    },
    overrides
  );
}

export function makeExpProxy(
  exp: IRuleSetHelpersX,
  overrides?: Partial<IRuleSetHelpersX>
): IRuleSetHelpersX {
  const writeExp = exp as IRuleSetHelpersX;
  return Object.assign(
    {},
    makeReadonlyExpProxy(exp, overrides),
    {
      set: (prop: string, val: string) => writeExp.set(prop, val),
      merge: (props: CSSProperties) => writeExp.merge(props),
      clear: (prop: string) => writeExp.clear(prop),
      clearAll: (props: string[]) => writeExp.clearAll(props),
    },
    overrides
  );
}

export function makeExpandedExp(
  exp: Partial<IBaseRuleSetHelpers>
): Partial<IRuleSetHelpersX> {
  const set = exp.set;
  const clear = exp.clear;
  const expanded: Partial<IRuleSetHelpersX> = Object.assign(
    {},
    exp,
    makeReadonlyExpandedExp(exp),
    set && {
      merge: (props: CSSProperties) =>
        Object.entries(props).forEach(([p, v]) => {
          if (!!v) {
            set(p, v);
          }
        }),
    },
    clear && {
      clearAll: (props: string[]) => props.forEach((p) => clear(p)),
    }
  );
  return expanded;
}

export function makeReadonlyExpandedExp(
  exp: Partial<ReadonlyIBaseRuleSetHelpers>
): Partial<ReadonlyIRuleSetHelpersX> {
  const getDefault =
    exp.getDefault || ((p: string) => getCssDefault(p, undefined));
  const getRaw = exp.getRaw;
  const expanded = Object.assign(
    {},
    exp,
    getRaw && {
      getRaw,
      get: (prop: string) =>
        ensure(expanded.getRaw, "Must specify getRaw")(prop) ||
        getDefault(prop),
    }
  );
  return expanded;
}

/**
 * Creates a IRuleSetHelpersX that reads from the effectiveVariantSetting() but
 * writes to the ensureCurrentVariantSetting().
 */
export function makeMergedExpProxy(
  effectiveExp: ReadonlyIRuleSetHelpersX,
  getTargetExp: () => IRuleSetHelpersX
): IRuleSetHelpersX {
  return {
    has: (prop: string) => effectiveExp.has(prop),
    get: (prop: string) => effectiveExp.get(prop),
    getRaw: (prop: string) => effectiveExp.getRaw(prop),
    props: () => effectiveExp.props(),
    set: (prop: string, val: string) => getTargetExp().set(prop, val),
    merge: (props: CSSProperties) => getTargetExp().merge(props),
    clear: (prop: string) => getTargetExp().clear(prop),
    clearAll: (props: string[]) => getTargetExp().clearAll(props),
  };
}

export function makeExpFromValues(
  values: Record<string, string>
): ReadonlyIRuleSetHelpersX {
  return {
    has: (prop: string) => prop in values,
    get: (prop: string) => values[prop] || getCssInitial(prop, undefined),
    getRaw: (prop: string) => values[prop],
    props: () => Object.keys(values),
  };
}

export function makeExpProxyWithOverrideRules(
  exp: ReadonlyIRuleSetHelpersX,
  overrides: Record<string, string>
): ReadonlyIRuleSetHelpersX {
  return makeReadonlyExpProxy(
    exp,
    makeReadonlyExpandedExp({
      has: (prop: string) => prop in overrides || exp.has(prop),
      getRaw: (prop: string) => overrides[prop] ?? exp.getRaw(prop),
      props: () => L.uniq([...Object.keys(overrides), ...exp.props()]),
    })
  );
}
