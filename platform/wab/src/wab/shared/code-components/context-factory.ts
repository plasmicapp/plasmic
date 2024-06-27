import { removeWhere } from "@/wab/shared/common";
import * as exprs from "@/wab/shared/core/exprs";
import { computedProjectFlags } from "@/wab/shared/cached-selectors";
import mobx from "@/wab/shared/import-mobx";
import {
  isKnownTplComponent,
  Site,
  TplComponent,
} from "@/wab/shared/model/classes";
import { isSlot } from "@/wab/shared/SlotUtils";
import { clone, cloneArgs } from "@/wab/shared/core/tpls";

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
    observeRelevantFields(clonedTpl);
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
    const targetArgs = target.vsettings[0].args;
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
    removeWhere(
      targetArgs,
      (arg) =>
        arg.param.variable.name !== "children" &&
        !sourceArgParams.has(arg.param)
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
        targetArgs.push(...cloneArgs([arg]));
      } else if (
        exprs.asCode(targetArg.expr, exprCtx).code !==
        exprs.asCode(arg.expr, exprCtx).code
      ) {
        targetArg.expr = exprs.clone(arg.expr);
      }
    });
    return target;
  }
}

export function observeRelevantFields(clonedContext: TplComponent) {
  const maybeMakeObservable: typeof mobx.makeObservable = (
    node,
    decorators
  ) => {
    if (!mobx.isObservable(node)) {
      mobx.makeObservable(node, decorators);
    }
    return node;
  };

  // The only thing we update is tpl.vsettings[0].args[i].expr
  maybeMakeObservable(clonedContext, {
    vsettings: mobx.observable,
  });
  maybeMakeObservable(clonedContext.vsettings[0], {
    args: mobx.observable,
  });
  clonedContext.vsettings[0].args.forEach((arg) =>
    // We want to observe all args, including the children arg. That's
    // because the children arg may get mutated as new global contexts
    // are added to site.globalContexts, and we need to trigger a re-render
    // then.
    maybeMakeObservable(arg, {
      expr: mobx.observable,
    })
  );
}
