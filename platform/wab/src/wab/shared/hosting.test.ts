import {
  getSetCustomDomainFailure,
  pickFailedOperation,
} from "@/wab/shared/hosting";

describe("getSetCustomDomainFailure", () => {
  it("reports no failure when the change went through", () => {
    expect(
      getSetCustomDomainFailure({
        domains: { "": { status: "DomainUpdated" } },
      })
    ).toBeUndefined();
  });

  it("reports a failed removal", () => {
    // A removal that fails leaves the domain registered and still serving the
    // project; callers that skip this check hide a site that is still up.
    expect(
      getSetCustomDomainFailure({
        domains: { "www.example.com": { status: "VercelAuthError" } },
      })
    ).toEqual({
      domain: "www.example.com",
      status: "VercelAuthError",
    });
  });

  it("includes the Vercel error code for the failed domain", () => {
    expect(
      getSetCustomDomainFailure({
        domains: {
          "www.example.com": {
            status: "DomainUsedElsewhereInVercel",
            vercelErrorCode: "domain_taken",
          },
        },
      })
    ).toEqual({
      domain: "www.example.com",
      status: "DomainUsedElsewhereInVercel",
      vercelErrorCode: "domain_taken",
    });
  });

  it("reports what a replacement failed to do to the domain", () => {
    // Submitting a new domain can fail while freeing the saved one; reporting
    // that as a failed registration hides what actually went wrong.
    expect(
      getSetCustomDomainFailure({
        domains: {
          "www.old.example": { status: "VercelAuthError", operation: "remove" },
        },
      })
    ).toEqual({
      domain: "www.old.example",
      status: "VercelAuthError",
      operation: "remove",
    });
  });

  it("reports a failure even when the response says nothing", () => {
    expect(getSetCustomDomainFailure({ domains: {} })).toEqual({
      domain: "",
      status: "OtherDomainError",
    });
  });
});

describe("pickFailedOperation", () => {
  it("prefers the operation the server reported over what was submitted", () => {
    // A domain change can fail while removing the old domain; that must not be
    // labeled a failed registration just because a new domain was submitted.
    expect(
      pickFailedOperation(
        {
          domain: "www.old.example",
          status: "OtherDomainError",
          operation: "remove",
        },
        "new.example"
      )
    ).toBe("remove");
  });

  it("falls back to what the client was doing", () => {
    const failure = { domain: "", status: "OtherDomainError" as const };
    expect(pickFailedOperation(failure, "new.example")).toBe("register");
    expect(pickFailedOperation(failure)).toBe("remove");
  });
});
