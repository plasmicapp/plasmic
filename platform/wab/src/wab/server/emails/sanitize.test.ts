import { sanitize } from "@/wab/server/emails/sanitize";

describe("sanitize", () => {
  it("passes clean text through unchanged", () => {
    expect(sanitize("Alex Rivera")).toEqual("Alex Rivera");
  });
});
