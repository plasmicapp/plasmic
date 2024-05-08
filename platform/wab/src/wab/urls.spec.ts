import { extractProjectIdFromUrlOrId, getPublicUrl } from "@/wab/urls";

describe("extractProjectIdFromUrlOrId", () => {
  it("works", () => {
    expect(extractProjectIdFromUrlOrId("abc")).toBe("abc");
    expect(extractProjectIdFromUrlOrId(`${getPublicUrl()}/projects/abc`)).toBe(
      "abc"
    );
    expect(
      extractProjectIdFromUrlOrId(`${getPublicUrl()}/projects/abc/docs`)
    ).toBe("abc");
    expect(
      extractProjectIdFromUrlOrId(`${getPublicUrl()}/projects/abc?foo=true`)
    ).toBe("abc");
  });
});
