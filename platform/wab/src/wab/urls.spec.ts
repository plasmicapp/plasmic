import { extractProjectIdFromUrlOrId } from "@/wab/urls";

describe("extractProjectIdFromUrlOrId", () => {
  it("works", () => {
    expect(extractProjectIdFromUrlOrId("abc")).toBe("abc");
    expect(
      extractProjectIdFromUrlOrId("https://studio.plasmic.app/projects/abc")
    ).toBe("abc");
    expect(
      extractProjectIdFromUrlOrId(
        "https://studio.plasmic.app/projects/abc/docs"
      )
    ).toBe("abc");
    expect(
      extractProjectIdFromUrlOrId(
        "https://studio.plasmic.app/projects/abc?foo=true"
      )
    ).toBe("abc");
  });
});
