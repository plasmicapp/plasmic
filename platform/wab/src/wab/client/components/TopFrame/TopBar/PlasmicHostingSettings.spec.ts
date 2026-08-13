import { pickDomainCards } from "@/wab/client/components/TopFrame/TopBar/PlasmicHostingSettings";

describe("pickDomainCards", () => {
  it("shows the saved www domain and its apex redirect", () => {
    // Fresh registrations save the www form as canonical; the apex card is
    // where the A-record instructions live.
    expect(pickDomainCards("www.example.com", undefined)).toEqual({
      savedDomain: "www.example.com",
      secondaryDomain: "example.com",
      candidateDomain: undefined,
      erroredDomain: undefined,
    });
  });

  it("shows a legacy saved apex domain and its www redirect", () => {
    expect(pickDomainCards("example.com", undefined)).toEqual({
      savedDomain: "example.com",
      secondaryDomain: "www.example.com",
      candidateDomain: undefined,
      erroredDomain: undefined,
    });
  });

  it("shows a saved subdomain alone, since it has no www pair", () => {
    expect(pickDomainCards("foo.example.com", undefined)).toEqual({
      savedDomain: "foo.example.com",
      secondaryDomain: undefined,
      candidateDomain: undefined,
      erroredDomain: undefined,
    });
  });

  it("gives a rejected candidate its own card, keeping the saved ones", () => {
    // The card for a candidate we failed to register must not offer to remove
    // the domain the project is still live on.
    expect(pickDomainCards("www.old.example", "www.new.example")).toEqual({
      savedDomain: "www.old.example",
      secondaryDomain: "old.example",
      candidateDomain: "www.new.example",
      erroredDomain: undefined,
    });
  });

  it("shows a rejected candidate alone when nothing is saved", () => {
    expect(pickDomainCards(undefined, "www.new.example")).toEqual({
      savedDomain: undefined,
      secondaryDomain: undefined,
      candidateDomain: "www.new.example",
      erroredDomain: undefined,
    });
  });

  it("shows a failure about the saved domain on its own card", () => {
    expect(pickDomainCards("www.example.com", "www.example.com")).toEqual({
      savedDomain: "www.example.com",
      secondaryDomain: "example.com",
      candidateDomain: undefined,
      erroredDomain: "www.example.com",
    });
  });

  it.each([
    ["www.example.com", "example.com"],
    ["example.com", "www.example.com"],
  ])(
    "shows a failure about the redirect of %s on the redirect card",
    (savedDomain, failedDomain) => {
      // The server expands the pair, so it can report a failure for the
      // member that isn't the saved canonical.
      expect(pickDomainCards(savedDomain, failedDomain)).toEqual({
        savedDomain,
        secondaryDomain: failedDomain,
        candidateDomain: undefined,
        erroredDomain: failedDomain,
      });
    }
  );
});
