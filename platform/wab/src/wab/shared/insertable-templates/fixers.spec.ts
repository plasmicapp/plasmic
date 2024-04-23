import {
  CustomCode,
  EventHandler,
  ImageAsset,
  ImageAssetRef,
  Rep,
} from "@/wab/classes";
import { ensure } from "@/wab/common";
import { codeLit } from "@/wab/exprs";
import { fixTplTreeExprs } from "@/wab/shared/insertable-templates/fixers";
import {
  BASE_VARIANT_NAME,
  mkVariant,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import { mkRep, mkTplTag } from "@/wab/tpls";

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
});
