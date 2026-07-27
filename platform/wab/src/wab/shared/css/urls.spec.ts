import { hasInvalidUrl, isValidUrl } from "@/wab/shared/css/urls";

describe("isValidUrl", () => {
  it("is true for absolute urls", () => {
    const validUrls = [
      "https://example.com/hero.png",
      "http://example.com/hero.png",
      "example.com/hero.png",
    ];
    for (const url of validUrls) {
      expect(isValidUrl(url)).toBe(true);
    }
  });

  it("is false for relative urls and data: URIs", () => {
    const invalidUrls = [
      "/images/hero.png",
      "./hero.png",
      "../assets/hero.png",
      "images/hero.png",
      "data:image/png;base64,iVBORw0KGgo=",
    ];
    for (const url of invalidUrls) {
      expect(isValidUrl(url)).toBe(false);
    }
  });
});

describe("hasInvalidUrl", () => {
  it("is false for values with no url() token", () => {
    expect(hasInvalidUrl("linear-gradient(#fff, #000)")).toBe(false);
    expect(hasInvalidUrl("10px")).toBe(false);
  });

  it("checks url() targets regardless of the function name casing", () => {
    expect(hasInvalidUrl("url(https://example.com/hero.png)")).toBe(false);
    expect(hasInvalidUrl("URL(/images/hero.png)")).toBe(true);
    expect(hasInvalidUrl("Url(https://example.com/ok.cur), pointer")).toBe(
      false
    );
  });

  it("is true when any url() in a multi-layer value is invalid", () => {
    expect(
      hasInvalidUrl(
        "linear-gradient(#fff, #000), url(https://example.com/a.png), url(/b.png)"
      )
    ).toBe(true);
  });
});
