import { TplMgr } from "@/wab/shared/TplMgr";
import {
  getPlasmicImgLoader,
  maybeMakePlasmicImgSrc,
} from "@/wab/shared/codegen/react-p/image";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { createSite } from "@/wab/shared/core/sites";
import { DEVFLAGS } from "@/wab/shared/devflags";

describe("getPlasmicImgLoader", () => {
  const defaultHost = DEVFLAGS.imgOptimizerHost;

  afterEach(() => {
    DEVFLAGS.imgOptimizerHost = defaultHost;
  });

  it('uses the "plasmic" loader for the production host', () => {
    DEVFLAGS.imgOptimizerHost = "https://img.plasmic.app";
    expect(getPlasmicImgLoader({ scheme: "cdn" })).toBe("plasmic");
  });

  it("uses a custom host as the loader's base URL", () => {
    DEVFLAGS.imgOptimizerHost = "https://img.example.com";
    expect(getPlasmicImgLoader({ scheme: "cdn" })).toBe(
      "https://img.example.com",
    );
  });

  it("omits the loader when there is no image optimizer host", () => {
    DEVFLAGS.imgOptimizerHost = "";
    expect(getPlasmicImgLoader({ scheme: "cdn" })).toBeUndefined();
  });

  it.each(["files", "public-files", "inlined"] as const)(
    "omits the loader for the %s scheme",
    (scheme) => {
      DEVFLAGS.imgOptimizerHost = "https://img.plasmic.app";
      expect(getPlasmicImgLoader({ scheme })).toBeUndefined();
    },
  );
});

describe("maybeMakePlasmicImgSrc", () => {
  const site = createSite();
  const picture = new TplMgr({ site }).addImageAsset({
    name: "bicycle",
    type: ImageAssetType.Picture,
    dataUri: "https://site-assets.plasmic.app/bicycle.jpg",
    width: 800,
    height: 600,
  });
  const defaultHost = DEVFLAGS.imgOptimizerHost;

  afterEach(() => {
    DEVFLAGS.imgOptimizerHost = defaultHost;
  });

  it("serves pictures through the image optimizer host", () => {
    DEVFLAGS.imgOptimizerHost = "https://img.example.com";
    expect(maybeMakePlasmicImgSrc(picture)).toMatchObject({
      src: "https://img.example.com/img-optimizer/v1/img/bicycle.jpg",
      fullWidth: 800,
      fullHeight: 600,
    });
  });

  it("keeps the original url and size when there is no image optimizer host", () => {
    DEVFLAGS.imgOptimizerHost = "";
    expect(maybeMakePlasmicImgSrc(picture)).toMatchObject({
      src: "https://site-assets.plasmic.app/bicycle.jpg",
      fullWidth: 800,
      fullHeight: 600,
    });
  });
});
