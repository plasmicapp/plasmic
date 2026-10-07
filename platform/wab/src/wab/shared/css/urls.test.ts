import {
  extractImageDataUrls,
  hasInvalidUrl,
  isValidUrl,
} from "@/wab/shared/css/urls";

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";
const GIF_DATA_URL = "data:image/gif;base64,R0lGODlhAQ==";

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
      PNG_DATA_URL,
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
      false,
    );
  });

  it("accepts an image embedded as a data: URI", () => {
    expect(hasInvalidUrl(`url(${PNG_DATA_URL})`)).toBe(false);
    expect(hasInvalidUrl(`url("${PNG_DATA_URL}") center / cover`)).toBe(false);
  });

  it("rejects a data: URI that does not hold an image", () => {
    expect(hasInvalidUrl("url(data:text/html;base64,PGgxPg==)")).toBe(true);
  });

  it("is true when any url() in a multi-layer value is invalid", () => {
    expect(
      hasInvalidUrl(
        "linear-gradient(#fff, #000), url(https://example.com/a.png), url(/b.png)",
      ),
    ).toBe(true);
  });
});

describe("extractImageDataUrls", () => {
  it("finds every embedded image in a value, without repeats", () => {
    expect(
      extractImageDataUrls(
        `url(${PNG_DATA_URL}) center, url("${GIF_DATA_URL}"), url('${PNG_DATA_URL}')`,
      ),
    ).toEqual([PNG_DATA_URL, GIF_DATA_URL]);
  });

  it("ignores urls that are not embedded images", () => {
    expect(
      extractImageDataUrls(
        "url(https://example.com/a.png), url(/b.png), linear-gradient(red, blue)",
      ),
    ).toEqual([]);
  });

  it("returns no urls for a value that does not parse as css", () => {
    expect(extractImageDataUrls("not valid :::")).toEqual([]);
  });
});
