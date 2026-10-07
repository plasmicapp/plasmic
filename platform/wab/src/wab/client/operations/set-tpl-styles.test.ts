import { mkTestVariantSetting } from "@/wab/__testonly__/tpls";
import { applySanitizedTplStyles } from "@/wab/client/operations/set-tpl-styles";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { CodeComponentsRegistry } from "@/wab/shared/code-components/code-components";
import { codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { mkTplTagX } from "@/wab/shared/core/tpls";

describe("applySanitizedTplStyles", () => {
  it("clears a style from the style attr once it moves into the RuleSet", () => {
    const keyShapes: Record<string, string>[] = [
      { fontSize: "14px" },
      { "font-size": "14px" },
    ];
    for (const safe of keyShapes) {
      const tpl = mkTplTagX("div");
      const vs = mkTestVariantSetting();
      vs.attrs["style"] = codeLit({ fontSize: "10px", mixBlendMode: "darken" });

      applySanitizedTplStyles({
        tpl,
        vs,
        effectiveRsh: RSH(vs.rs, tpl),
        ccRegistry: new CodeComponentsRegistry(globalThis, {}),
        safe,
        unsafe: {},
      });

      expect(vs.rs.values).toEqual({ "font-size": "14px" });
      expect(tryExtractJson(vs.attrs["style"])).toEqual({
        mixBlendMode: "darken",
      });
    }
  });
});
