import { TplMgr } from "@/wab/shared/TplMgr";
import {
  getCmsImageUrl,
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

describe("image asset URLs", () => {
  const key = "07a7153536a89fef14e0075c7632d6b3.jpg";
  const dataUri = `https://site-assets.plasmic.app/${key}`;
  const site = createSite();
  const picture = (src = dataUri) =>
    new TplMgr({ site }).addImageAsset({
      name: "bicycle",
      type: ImageAssetType.Picture,
      dataUri: src,
      width: 800,
      height: 600,
    });
  const defaultHost = DEVFLAGS.imgOptimizerHost;

  const defaultAssetsBase = DEVFLAGS.siteAssetsBaseUrl;

  afterEach(() => {
    DEVFLAGS.siteAssetsBaseUrl = defaultAssetsBase;
    DEVFLAGS.imgOptimizerHost = defaultHost;
  });

  it("serves pictures through the image optimizer host", () => {
    DEVFLAGS.imgOptimizerHost = "https://img.example.com";
    expect(maybeMakePlasmicImgSrc(picture())).toMatchObject({
      src: `https://img.example.com/i/${key}`,
      fullWidth: 800,
      fullHeight: 600,
    });
  });

  it.each([
    `https://external.example/${key}`,
    dataUri.replace(".jpg", ".svg") + "?v=1",
  ])("preserves the source of %s", (src) => {
    DEVFLAGS.imgOptimizerHost = "https://img.example.com";
    expect(maybeMakePlasmicImgSrc(picture(src))).toMatchObject({ src });
  });

  it("uses the configured site-assets base for uploads", () => {
    DEVFLAGS.imgOptimizerHost = "https://img.example.com";
    DEVFLAGS.siteAssetsBaseUrl = "https://assets.example.com/bucket/";
    const src = DEVFLAGS.siteAssetsBaseUrl + key;
    expect(maybeMakePlasmicImgSrc(picture(src))).toMatchObject({
      src: `https://img.example.com/i/${key}`,
    });
    const external = `https://assets.example.com/other/${key}`;
    expect(maybeMakePlasmicImgSrc(picture(external))).toMatchObject({
      src: external,
    });
  });

  it.each([
    [3840, "q=75&f=webp"],
    [3841, "w=3840&q=75&f=webp"],
  ] as const)("caps CMS uploads wider than 3840 (%i)", (width, params) => {
    DEVFLAGS.imgOptimizerHost = "https://img.example.com";
    expect(getCmsImageUrl({ dataUri, width, height: 600 })).toBe(
      `https://img.example.com/i/${key}?${params}`,
    );
  });

  it("keeps the original url and size when there is no image optimizer host", () => {
    DEVFLAGS.imgOptimizerHost = "";
    expect(maybeMakePlasmicImgSrc(picture())).toMatchObject({
      src: dataUri,
      fullWidth: 800,
      fullHeight: 600,
    });
  });
});
