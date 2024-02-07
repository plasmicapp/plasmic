import { Component, Mixin, TplNode } from "@/wab/classes";
import { xAddAll } from "@/wab/common";
import { flattenTpls } from "@/wab/tpls";

export function extractUsedMixinsForComponents(components: Component[]) {
  const mixins = new Set<Mixin>();
  for (const component of components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      collectUsedMixinsForTpl(mixins, tpl);
    }
  }
  return mixins;
}

export function collectUsedMixinsForTpl(mixins: Set<Mixin>, tpl: TplNode) {
  for (const vs of tpl.vsettings) {
    xAddAll(mixins, vs.rs.mixins);
  }
}
