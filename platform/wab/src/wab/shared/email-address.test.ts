import { parseEmailAddress } from "@/wab/shared/email-address";

describe("parseEmailAddress", function () {
  it("parses well-formed emails", () => {
    expect(parseEmailAddress("user@example.com")).toEqual({
      original: "user@example.com",
      normalized: "user@example.com",
      normalizedLocalPart: "user",
      normalizedDomain: "example.com",
    });
    expect(parseEmailAddress("user+tag@mail.example.com")).toEqual({
      original: "user+tag@mail.example.com",
      normalized: "user+tag@mail.example.com",
      normalizedLocalPart: "user+tag",
      normalizedDomain: "mail.example.com",
    });
    expect(parseEmailAddress("a".repeat(242) + "@example.com")).toEqual({
      original: "a".repeat(242) + "@example.com",
      normalized: "a".repeat(242) + "@example.com",
      normalizedLocalPart: "a".repeat(242),
      normalizedDomain: "example.com",
    });
  });

  it("lowercases normalized fields but preserves original casing", () => {
    expect(parseEmailAddress("User@Example.COM")).toEqual({
      original: "User@Example.COM",
      normalized: "user@example.com",
      normalizedLocalPart: "user",
      normalizedDomain: "example.com",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseEmailAddress("  User@Example.com\n")).toEqual({
      original: "User@Example.com",
      normalized: "user@example.com",
      normalizedLocalPart: "user",
      normalizedDomain: "example.com",
    });
    expect(parseEmailAddress("   ")).toBeNull();
  });

  it("rejects malformed emails", () => {
    expect(parseEmailAddress("")).toBeNull();
    expect(parseEmailAddress("user")).toBeNull();
    expect(parseEmailAddress("user@example")).toBeNull();
    expect(parseEmailAddress("user @example.com")).toBeNull();
    expect(parseEmailAddress("@example.com")).toBeNull();
  });

  it("rejects trailing dots", () => {
    expect(parseEmailAddress("user@mailinator.com.")).toBeNull();
    expect(parseEmailAddress("user@example.com..")).toBeNull();
    expect(parseEmailAddress("user@example.")).toBeNull();
  });

  it("rejects emails longer than 254 characters", () => {
    expect(parseEmailAddress("a".repeat(243) + "@example.com")).toBeNull();
    expect(parseEmailAddress("user@" + "a.".repeat(200) + "com")).toBeNull();
  });
});
