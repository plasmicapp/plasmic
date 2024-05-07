import {
  Arg,
  isKnownRenderExpr,
  RenderExpr,
  TplComponent,
  TplNode,
} from "@/wab/classes";
import { arrayEq, assert, ensure } from "@/wab/common";
import {
  ContextFactory,
  observeRelevantFields,
} from "@/wab/shared/code-components/context-factory";
import { getSlotArgs } from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";

export function wrapWithContext(
  root: TplComponent,
  contexts: TplComponent[],
  contextFactory: ContextFactory
): TplNode {
  const persistentContexts = contexts.map((c) => contextFactory.cached(c));

  // The contexts order/list could have changed, so we need to fix
  // the parents and children.
  persistentContexts.forEach((cur, idx) => {
    if (idx === 0) {
      return;
    }
    const child = $$$(persistentContexts[idx - 1]).getSlotArg("children");
    if (child) {
      assert(isKnownRenderExpr(child.expr), `only tpl can be in children arg`);
      if (!arrayEq(child.expr.tpl, [cur])) {
        $$$(persistentContexts[idx - 1]).setSlotArg(
          "children",
          new RenderExpr({ tpl: [cur] })
        );
      }
    } else {
      $$$(persistentContexts[idx - 1]).setSlotArg(
        "children",
        new RenderExpr({ tpl: [cur] })
      );
    }
  });

  // Manually add the root as the child of the last global context
  // to avoid changing the root.parent
  if (persistentContexts.length > 0) {
    const lastIndex = persistentContexts.length - 1;
    const param = ensure(
      persistentContexts[lastIndex].component.params.find(
        (p) => p.variable.name === "children"
      ),
      `global contexts must have a children param`
    );
    const maybeArg = getSlotArgs(persistentContexts[lastIndex]).find(
      (arg) => arg.param === param
    );

    const arg =
      maybeArg != null ? maybeArg : new Arg({ param, expr: null as any });
    if (!isKnownRenderExpr(arg.expr) || !arrayEq(arg.expr.tpl, [root])) {
      arg.expr = new RenderExpr({ tpl: [root] });
      if (!maybeArg) {
        persistentContexts[lastIndex].vsettings[0].args.push(arg);
      }
    }

    // We make sure all the relevant fields of the cached contexts are observed.
    // We do it here because we have just created some new args by doing all
    // this context wrapping.
    for (const c of persistentContexts) {
      observeRelevantFields(c);
    }

    return persistentContexts[0];
  }

  return root;
}
