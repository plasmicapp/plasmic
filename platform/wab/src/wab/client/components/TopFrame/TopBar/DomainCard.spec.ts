import { renderDomainErrorMessage } from "@/wab/client/components/TopFrame/TopBar/DomainCard";

describe("renderDomainErrorMessage", () => {
  it("explains an ownership conflict, with the provider's code for support", () => {
    expect(
      renderDomainErrorMessage("example.com", {
        status: "DomainUsedElsewhereInVercel",
        vercelErrorCode: "domain_taken",
        operation: "register",
      })
    ).toContain("(domain_taken)");
  });

  it("blames a rejected API token on us, not on the user's domain", () => {
    expect(
      renderDomainErrorMessage("example.com", {
        status: "VercelAuthError",
        operation: "register",
      })
    ).toBe(
      "Plasmic couldn't reach our hosting provider to register example.com. " +
        "Please contact support."
    );
  });

  it("says what failed when a removal is rejected", () => {
    // The domain is still registered, so telling the user it couldn't be
    // registered points them at the wrong problem.
    expect(
      renderDomainErrorMessage("example.com", {
        status: "OtherDomainError",
        operation: "remove",
      })
    ).toBe("example.com couldn't be removed. Please contact support.");
    expect(
      renderDomainErrorMessage("example.com", {
        status: "VercelAuthError",
        operation: "remove",
      })
    ).toContain("to remove example.com");
  });

  it("falls back to the raw error for a request that threw", () => {
    expect(
      renderDomainErrorMessage("example.com", {
        message: "Network request failed",
        operation: "remove",
      })
    ).toBe("example.com couldn't be removed: Network request failed");
  });
});
