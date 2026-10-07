import { replaceImageDataUrisInStyles } from "@/wab/client/web-importer/images";

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";
const GIF_DATA_URL = "data:image/gif;base64,R0lGODlhAQ==";

describe("replaceImageDataUrisInStyles", () => {
  const assetRefs = new Map([[PNG_DATA_URL, "var(--image-abc123)"]]);

  it("swaps the embedded image for its asset ref, whatever the quoting", () => {
    expect(
      replaceImageDataUrisInStyles(
        {
          background: `url(${PNG_DATA_URL})`,
          backgroundImage: `url("${PNG_DATA_URL}")`,
          listStyleImage: `url( '${PNG_DATA_URL}' )`,
        },
        assetRefs,
      ),
    ).toEqual({
      background: "var(--image-abc123)",
      backgroundImage: "var(--image-abc123)",
      listStyleImage: "var(--image-abc123)",
    });
  });

  it("matches the url() function name case-insensitively, as css does", () => {
    expect(
      replaceImageDataUrisInStyles(
        {
          background: `URL(${PNG_DATA_URL})`,
          backgroundImage: `Url("${PNG_DATA_URL}")`,
        },
        assetRefs,
      ),
    ).toEqual({
      background: "var(--image-abc123)",
      backgroundImage: "var(--image-abc123)",
    });
  });

  it("leaves the rest of the value untouched", () => {
    expect(
      replaceImageDataUrisInStyles(
        {
          background: `url("${PNG_DATA_URL}") center center / cover no-repeat, linear-gradient(red, red)`,
        },
        assetRefs,
      ),
    ).toEqual({
      background:
        "var(--image-abc123) center center / cover no-repeat, linear-gradient(red, red)",
    });
  });

  it("drops the declaration when one of its images has no asset", () => {
    expect(
      replaceImageDataUrisInStyles(
        { background: `url(${PNG_DATA_URL}), url(${GIF_DATA_URL})` },
        assetRefs,
      ),
    ).toEqual({});
  });

  it("drops the image declarations when no image was uploaded", () => {
    expect(
      replaceImageDataUrisInStyles(
        { background: `url(${PNG_DATA_URL})`, color: "red" },
        new Map(),
      ),
    ).toEqual({ color: "red" });
  });
});
