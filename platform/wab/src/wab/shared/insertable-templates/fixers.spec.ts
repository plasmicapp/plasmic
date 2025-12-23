import { TplMgr } from "@/wab/shared/TplMgr";
import {
  BASE_VARIANT_NAME,
  mkVariant,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import { ensure } from "@/wab/shared/common";
import { codeLit } from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import { mkRep, mkTplTag } from "@/wab/shared/core/tpls";
import {
  fixTplTreeExprs,
  makeTplAnimationsFixer,
} from "@/wab/shared/insertable-templates/fixers";
import {
  CustomCode,
  EventHandler,
  ImageAsset,
  ImageAssetRef,
  Rep,
} from "@/wab/shared/model/classes";

describe("Insertable templates fixers", () => {
  describe("fixTplTreeExprs", () => {
    it("works", () => {
      const imageAsset = new ImageAsset({
        uuid: "image-id",
        name: "image",
        type: "picture",
        dataUri: "imageUri",
        width: 100,
        height: 100,
        aspectRatio: 1,
      });

      const tpl = mkTplTag("div", [], {
        baseVariant: mkVariant({
          name: BASE_VARIANT_NAME,
        }),
        attrs: {
          href: codeLit("https://example.com"),
          onClick: new EventHandler({
            interactions: [],
          }),
          src: new ImageAssetRef({
            asset: imageAsset,
          }),
        },
        dataCond: codeLit("$props.showTitle"),
        dataRep: mkRep("elements", codeLit("[1, 2, 3]")),
      });

      const vs = ensure(
        tryGetBaseVariantSetting(tpl),
        "Expect tpl to have base variant setting"
      );

      const getNewImageAsset = jest.fn().mockReturnValue(imageAsset);

      fixTplTreeExprs(
        {
          isOwned: false,
          invalidExprNames: ["showTitle"],
        },
        tpl,
        vs,
        {
          getNewImageAsset,
        }
      );

      expect(vs.attrs["onClick"]).toBeNil();
      expect(vs.attrs["href"]).toBeInstanceOf(CustomCode);
      expect(vs.attrs["src"]).toBeInstanceOf(ImageAssetRef);
      expect(getNewImageAsset).toBeCalledTimes(1);
      expect(getNewImageAsset).toBeCalledWith(imageAsset);
      expect(vs.dataCond).toBeNil();
      expect(vs.dataRep).toBeInstanceOf(Rep);
      expect(vs.dataRep?.collection).toBeInstanceOf(CustomCode);
      expect((vs.dataRep?.collection as CustomCode).code).toBe('"[1, 2, 3]"');
    });
  });

  describe("makeTplAnimationsFixer", () => {
    let sourceSite: ReturnType<typeof createSite>;
    let sourceTplMgr: TplMgr;

    beforeAll(() => {
      sourceSite = createSite();
      sourceTplMgr = new TplMgr({ site: sourceSite });
    });

    it("reuses existing animation sequence with same name from target site", () => {
      const targetSite = createSite();
      const targetTplMgr = new TplMgr({ site: targetSite });

      const sourceSeq = sourceTplMgr.addAnimationSequence("Test1_FadeIn");
      const targetSeq = targetTplMgr.addAnimationSequence("Test1_FadeIn");

      const baseVariant = mkVariant({ name: BASE_VARIANT_NAME });
      const tpl = mkTplTag("div", [], {
        baseVariant,
        attrs: {},
      });

      const vs = ensure(
        tryGetBaseVariantSetting(tpl),
        "Expect tpl to have base variant setting"
      );
      vs.rs.animations = [sourceTplMgr.addAnimation(sourceSeq)];

      // Verify animation initially references source sequence
      expect(vs.rs.animations[0].sequence).toBe(sourceSeq);

      const fixer = makeTplAnimationsFixer(targetSite);
      fixer(tpl);

      // After fixing, animation should reference target sequence
      expect(vs.rs.animations[0].sequence).toBe(targetSeq);
      // No new sequences should be added to target site
      expect(targetSite.animationSequences.length).toBe(1);
    });

    it("clones animation sequence to target site if no matching name exists", () => {
      const targetSite = createSite();

      const sourceSeq = sourceTplMgr.addAnimationSequence("Test2_SlideIn");

      const baseVariant = mkVariant({ name: BASE_VARIANT_NAME });
      const tpl = mkTplTag("div", [], {
        baseVariant,
        attrs: {},
      });

      const vs = ensure(
        tryGetBaseVariantSetting(tpl),
        "Expect tpl to have base variant setting"
      );
      vs.rs.animations = [sourceTplMgr.addAnimation(sourceSeq)];

      // Target site has no animation sequences
      expect(targetSite.animationSequences.length).toBe(0);

      const fixer = makeTplAnimationsFixer(targetSite);
      fixer(tpl);

      // A new sequence should be cloned to target site
      expect(targetSite.animationSequences.length).toBe(1);
      const clonedSeq = targetSite.animationSequences[0];
      expect(clonedSeq.name).toBe("Test2_SlideIn");
      expect(clonedSeq.uuid).not.toBe(sourceSeq.uuid);

      // Animation should reference the cloned sequence
      expect(vs.rs.animations[0].sequence).toBe(clonedSeq);
    });

    it("handles multiple animations with mixed existing/new sequences", () => {
      const targetSite = createSite();
      const targetTplMgr = new TplMgr({ site: targetSite });

      const sourceSeq1 = sourceTplMgr.addAnimationSequence("Test3_FadeIn");
      const sourceSeq2 = sourceTplMgr.addAnimationSequence("Test3_SlideOut");

      // Target site only has FadeIn
      const targetSeq1 = targetTplMgr.addAnimationSequence("Test3_FadeIn");

      const baseVariant = mkVariant({ name: BASE_VARIANT_NAME });
      const tpl = mkTplTag("div", [], {
        baseVariant,
        attrs: {},
      });

      const vs = ensure(
        tryGetBaseVariantSetting(tpl),
        "Expect tpl to have base variant setting"
      );
      vs.rs.animations = [
        sourceTplMgr.addAnimation(sourceSeq1),
        sourceTplMgr.addAnimation(sourceSeq2),
      ];

      const fixer = makeTplAnimationsFixer(targetSite);
      fixer(tpl);

      // FadeIn should be reused, SlideOut should be cloned
      expect(targetSite.animationSequences.length).toBe(2);

      // First animation should reference existing target sequence
      expect(vs.rs.animations[0].sequence).toBe(targetSeq1);

      // Second animation should reference cloned sequence
      const clonedSeq2 = targetSite.animationSequences.find(
        (s) => s.name === "Test3_SlideOut"
      );
      expect(vs.rs.animations[1].sequence).toBe(clonedSeq2);
    });
  });
});
