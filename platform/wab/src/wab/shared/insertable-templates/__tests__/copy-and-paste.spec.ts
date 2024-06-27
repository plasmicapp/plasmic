import { ensure } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { cloneCopyState } from "@/wab/shared/insertable-templates";
import copyAndPasteBundle from "@/wab/shared/insertable-templates/__tests__/bundles/copy-and-paste.json";
import { CopyElementsReference } from "@/wab/shared/insertable-templates/types";
import {
  isKnownCustomCode,
  isKnownObjectPath,
  Site,
} from "@/wab/shared/model/classes";
import { mkBaseVariant } from "@/wab/shared/Variants";
import { createSite } from "@/wab/shared/core/sites";
import {
  findExprsInTree,
  flattenTpls,
  isTplNamable,
  mkTplTag,
} from "@/wab/shared/core/tpls";

describe("cloneCopyState", () => {
  const getBundleSite = async (projectBundle: Bundle) => {
    const site = new Bundler().unbundle(projectBundle, "") as Site;
    return site;
  };

  it("can copy multiple elements", async () => {
    const source = await getBundleSite(copyAndPasteBundle[0][1] as Bundle);
    const homepage = ensure(
      source.components.find((c) => c.name === "Homepage"),
      "Homepage not found"
    );

    const tplOption0 = ensure(
      flattenTpls(homepage.tplTree).find(
        (tpl) => isTplNamable(tpl) && tpl.name === "option0"
      ),
      "option0 not found"
    );
    const tplOption1 = ensure(
      flattenTpls(homepage.tplTree).find(
        (tpl) => isTplNamable(tpl) && tpl.name === "option1"
      ),
      "option1 not found"
    );

    const refOptions: CopyElementsReference[] = [tplOption0, tplOption1].map(
      (tpl) => ({
        type: "tpl-node",
        uuid: tplOption0.uuid,
        activeVariantsUuids: [],
      })
    );

    const target = createSite();
    const component = mkComponent({
      type: ComponentType.Plain,
      name: "Owner",
      tplTree: mkTplTag("div", []),
    });
    const baseVariant = mkBaseVariant();

    function executeCloneCopyState(refOption: CopyElementsReference) {
      const { nodesToPaste, seenFonts } = cloneCopyState(
        target,
        {
          site: source,
          component: homepage,
          screenVariant: undefined,
          hostLessDependencies: {},
          projectId: "source",
          resolution: {
            token: "reuse-by-name",
            component: "reuse",
          },
          references: [refOption],
        },
        baseVariant,
        undefined,
        component,
        () => null
      );

      expect([...seenFonts]).toEqual(["Arial", "Inter"]);
      for (const node of nodesToPaste) {
        const allExprRef = findExprsInTree(node);
        for (const exprRef of allExprRef) {
          // there should be no reference to $state in the copied unowned tree
          if (isKnownCustomCode(exprRef.expr)) {
            expect(exprRef.expr.code).not.toInclude("$state");
          } else if (isKnownObjectPath(exprRef.expr)) {
            expect(exprRef.expr.path.join(".")).not.toInclude("$state");
          }
        }
      }
    }

    executeCloneCopyState(refOptions[0]);

    executeCloneCopyState(refOptions[1]);

    // Re execute the option1 to ensure that duplicates are not created in the target site
    executeCloneCopyState(refOptions[1]);

    // We should have `ComponentWithImagesAndProps`, `ComponentWithTokens` and `StatefulComponent`
    expect(target.components.map((c) => c.name).sort()).toEqual([
      "ComponentWithImagesAndProps",
      "ComponentWithTokens",
      "StatefulComponent",
    ]);
    expect(
      target.styleTokens.map((token) => `${token.name}|${token.value}`).sort()
    ).toEqual(
      source.styleTokens.map((token) => `${token.name}|${token.value}`).sort()
    );
    expect(target.imageAssets.length).toEqual(source.imageAssets.length);
  });
});
