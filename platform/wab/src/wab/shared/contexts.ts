import { getTplComponentArg, setTplComponentArg } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { ContextFactory } from "@/wab/shared/code-components/context-factory";
import { arrayEq, assert, ensure } from "@/wab/shared/common";
import {
  RenderExpr,
  TplComponent,
  TplNode,
  isKnownRenderExpr,
} from "@/wab/shared/model/classes";

export function wrapWithContext(
  root: TplComponent,
  contexts: ReadonlyArray<TplComponent>,
  contextFactory: ContextFactory,
): TplNode {
  const persistentContexts = contexts.map((c) => contextFactory.cached(c));

  // The contexts order/list could have changed, so we need to fix
  // the parents and children.
  persistentContexts.forEach((cur, idx) => {
    if (idx === 0) {
      return;
    }
    const parent = persistentContexts[idx - 1];
    const child = $$$(parent).getSlotArg("children");
    if (child) {
      assert(isKnownRenderExpr(child.expr), `only tpl can be in children arg`);
      if (arrayEq(child.expr.tpl, [cur])) {
        return;
      }
    }
    $$$(parent).setSlotArg("children", new RenderExpr({ tpl: [cur] }));
  });

  // Manually add the root as the child of the last global context
  // to avoid changing the root.parent
  if (persistentContexts.length > 0) {
    const lastIndex = persistentContexts.length - 1;
    const param = ensure(
      persistentContexts[lastIndex].component.params.find(
        (p) => p.variable.name === "children",
      ),
      `global contexts must have a children param`,
    );
    const lastContext = persistentContexts[lastIndex];
    const baseVs = ensureBaseVariantSetting(lastContext);
    const arg = getTplComponentArg(lastContext, baseVs, param.variable);
    if (
      !arg ||
      !isKnownRenderExpr(arg.expr) ||
      !arrayEq(arg.expr.tpl, [root])
    ) {
      setTplComponentArg(
        lastContext,
        baseVs,
        param.variable,
        new RenderExpr({ tpl: [root] }),
      );
    }

    return persistentContexts[0];
  }

  return root;
}
