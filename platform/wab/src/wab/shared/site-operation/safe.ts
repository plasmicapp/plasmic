/**
 * Readonly versions of types in classes.ts
 *
 * This is a placeholder until we implement a better version.
 * For now, it uses ReadonlyDeep, but this doesn't work well
 * in some cases.
 */

import type { ConditionalOverrideDeep } from "@/wab/commons/types";
import type { Component, TplNode } from "@/wab/shared/model/classes";
import type { OverrideProperties, ReadonlyDeep } from "type-fest";

export type Safe<T> = ConditionalOverrideDeep<T, Component, SafeComponent>;

export type SafeComponent = OverrideProperties<
  Component,
  {
    readonly tplTree: SafeTplNode;
  }
>;

export type SafeTplNode = ReadonlyDeep<TplNode>;
