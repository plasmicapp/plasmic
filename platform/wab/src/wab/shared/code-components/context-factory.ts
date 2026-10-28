import { computedProjectFlags } from "@/wab/shared/cached-selectors";
import { arrayEq } from "@/wab/shared/common";
import * as exprs from "@/wab/shared/core/exprs";
import { clone, cloneArgs } from "@/wab/shared/core/tpls";
import {
  isKnownTplComponent,
  Site,
  TplComponent,
} from "@/wab/shared/model/classes";
import { isSlot } from "@/wab/shared/SlotUtils";

export class ContextFactory {
  private knownContexts: Record<string, TplComponent> = {};

  constructor(private site: Site) {}

  cached(tpl: TplComponent): TplComponent {
    const existing = this.knownContexts[tpl.uuid];

    let clonedTpl: TplComponent;
    if (existing) {
      clonedTpl = this.merge(existing, tpl);
    } else {
      clonedTpl = clone(tpl, true);
    }
    this.knownContexts[tpl.uuid] = clonedTpl;
    return clonedTpl;
  }

  private merge(target: TplComponent, source: TplComponent): TplComponent {
    if (target === source) {
      return target;
    }
    if (!isKnownTplComponent(target) || !isKnownTplComponent(source)) {
      return clone(source, true);
    }

    if (target.uuid !== source.uuid) {
      return clone(source, true);
    }

    // Clone args except children
    const params = new Set(source.component.params);
    const targetVs = target.vsettings[0];
    const targetArgs = targetVs.args;
    const targetParam2Arg = new Map(targetArgs.map((arg) => [arg.param, arg]));
    const sourceArgs = source.vsettings[0].args;
    const sourceArgParams = new Set(sourceArgs.map((arg) => arg.param));

    if (targetArgs.some((arg) => !params.has(arg.param))) {
      // The params might not match if we upgraded a hostless dep with global
      // contexts, since some args (the children args) aren't stored in
      // the bundle and thus not fixed in the upgrade
      return clone(source, true);
    }

    // We remove targetArgs that are no longer in sourceArgs. But we make
    // an exception for children, because the sourceArgs will never have
    // children set (source is from site.globalContexts, which only stores
    // the settings, but not the children). Otherwise, we'll keep removing
    // children from targetArgs, only to add it back later as we start
    // wrapping the global contexts with each other and the root tpl, which
    // causes a re-render.
    const newArgs = targetArgs.filter(
      (arg) =>
        arg.param.variable.name === "children" ||
        sourceArgParams.has(arg.param),
    );
    const exprCtx: exprs.ExprCtx = {
      projectFlags: computedProjectFlags(this.site),
      component: null,
      inStudio: true,
    };
    sourceArgs.forEach((arg) => {
      if (isSlot(arg.param)) {
        return;
      }
      const targetArg = targetParam2Arg.get(arg.param);
      if (!targetArg) {
        newArgs.push(...cloneArgs([arg]));
      } else if (
        exprs.asCode(targetArg.expr, exprCtx).code !==
        exprs.asCode(arg.expr, exprCtx).code
      ) {
        targetArg.expr = exprs.clone(arg.expr);
      }
    });
    // Reassign only if changed, to avoid a needless re-render
    if (!arrayEq(newArgs, targetArgs)) {
      targetVs.args = newArgs;
    }
    return target;
  }
}
