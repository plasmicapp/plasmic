import {
  extractAppUserFromToken,
  issueOauthCode,
  parseRedirectURI,
} from "@/wab/server/routes/app-oauth";
import { UnauthorizedError } from "@/wab/shared/ApiErrors/errors";
import { Request, Response } from "express-serve-static-core";

describe("auth errors", () => {
  it("issueOauthCode throws UnauthorizedError when logged out", async () => {
    await expect(
      issueOauthCode({ query: {} } as Request, {} as Response),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("extractAppUserFromToken throws UnauthorizedError for an invalid token", () => {
    expect(() =>
      extractAppUserFromToken({
        id: "req",
        headers: { "x-plasmic-data-user-auth-token": "not-a-jwt" },
      } as unknown as Request),
    ).toThrow(UnauthorizedError);
  });
});

describe("parseRedirectURI", () => {
  it("should validate redirectUri", () => {
    // redirectUri not a string
    expect(
      parseRedirectURI(["https://tests.plasmic.run/"], "", [], []),
    ).toMatchObject({
      valid: false,
    });

    // Invalid protocol
    expect(
      parseRedirectURI("ftp://tests.plasmic.run/", "", [], []),
    ).toMatchObject({
      valid: false,
    });

    // redirectUri not registered
    expect(
      parseRedirectURI("https://tests.plasmic.run/", "", [], []),
    ).toMatchObject({
      valid: false,
    });

    // Valid redirectUri, registered in the redirectUris
    expect(
      parseRedirectURI(
        "https://tests.plasmic.run/",
        "",
        ["https://tests.plasmic.run/"],
        ["dummy.domain"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "https://tests.plasmic.run/",
    });

    // Valid redirectUri, registered through domains
    expect(
      parseRedirectURI(
        "https://tests.plasmic.run/",
        "",
        [],
        ["dummy.domain", "tests.plasmic.run"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "https://tests.plasmic.run/",
    });

    // Valid redirectUri, registered through domains, state define a continueTo
    // but it is not used as it's a setted redirectUri
    expect(
      parseRedirectURI(
        "https://tests.plasmic.run/",
        `"{"continueTo": "/subpage"}"`,
        [],
        ["tests.plasmic.run"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "https://tests.plasmic.run/",
    });

    // No redirect uri, no domains set
    expect(
      parseRedirectURI(undefined, "", ["https://tests.plasmic.run"], []),
    ).toMatchObject({
      valid: false,
    });

    // No redirect uri, domain set
    expect(
      parseRedirectURI(
        undefined,
        "",
        ["https://tests.plasmic.run"],
        ["domains.plasmic.run", "dummy.domain"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "https://domains.plasmic.run/",
    });

    // No redirect uri, domain set, continueTo set in state
    expect(
      parseRedirectURI(
        undefined,
        `{"continueTo":"/subpage"}`,
        ["https://tests.plasmic.run"],
        ["domains.plasmic.run", "dummy.domain"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "https://domains.plasmic.run/subpage",
    });

    // No redirect uri, domain set, continueTo set to another domain
    expect(
      parseRedirectURI(
        undefined,
        `{"continueTo": "https://test.plasmic.run/subpage"}`,
        ["https://tests.plasmic.run"],
        ["domains.plasmic.run", "dummy.domain"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "https://domains.plasmic.run/",
    });

    // No redirect uri, domain set, continueTo set to same domain
    expect(
      parseRedirectURI(
        undefined,
        `{"continueTo": "https://domains.plasmic.run/subpage"}`,
        ["https://tests.plasmic.run"],
        ["domains.plasmic.run", "dummy.domain"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "https://domains.plasmic.run/subpage",
    });

    // Should handle localhost through domains
    expect(
      parseRedirectURI(
        undefined,
        "",
        ["https://tests.plasmic.run"],
        ["localhost:3000", "dummy.domain"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "http://localhost:3000/",
    });

    expect(
      parseRedirectURI(
        undefined,
        `{"continueTo":"/subpage"}`,
        ["https://tests.plasmic.run"],
        ["localhost:3000", "dummy.domain"],
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "http://localhost:3000/subpage",
    });

    expect(
      parseRedirectURI(
        undefined,
        `{"continueTo":"/subpage"}`,
        ["https://tests.plasmic.run"],
        [],
        "dummy.domain",
      ),
    ).toMatchObject({
      valid: false,
    });

    expect(
      parseRedirectURI(
        undefined,
        `{"continueTo":"/subpage"}`,
        ["https://tests.plasmic.run"],
        ["localhost:3000", "dummy.domain"],
        "dummy.domain",
      ),
    ).toMatchObject({
      valid: true,
      redirectUri: "https://dummy.domain/subpage",
    });
  });
});
