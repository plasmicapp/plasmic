import { mkDataDragTargeting } from "@/wab/client/components/sidebar-tabs/DataBinding/data-drag";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import type { TplNode } from "@/wab/shared/model/classes";

it.each(["inside", "outside"] as const)(
  "checks the named provider binding for %s canvas drops",
  (where) => {
    const inside = { uuid: "inside-provider" } as TplNode;
    const outside = { uuid: "outside-provider" } as TplNode;
    const getCanvasEnvForTpl = vi.fn((tpl) => ({
      $ctx: tpl === inside ? { product: undefined } : {},
    }));
    const vc = {
      getCanvasEnvForTpl,
      currentComponent: () => undefined,
    } as unknown as ViewCtx;
    const targeting = mkDataDragTargeting({
      path: ["$ctx", "product", "name"],
      label: "name",
      value: "Product",
      varType: "string",
      sourceViewCtx: vc,
      envKeys: ["$ctx"],
    });
    expect(targeting.isAvailable(vc, outside, where)).toBe(false);
    expect(targeting.isAvailable(vc, inside, where)).toBe(true);
    expect(getCanvasEnvForTpl).toHaveBeenLastCalledWith(
      inside,
      where === "outside" ? { forDataRepCollection: true } : undefined,
    );
  },
);
