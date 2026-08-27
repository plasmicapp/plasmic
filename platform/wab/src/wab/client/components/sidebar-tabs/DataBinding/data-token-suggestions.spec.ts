import { getDataTokenSuggestions } from "@/wab/client/components/sidebar-tabs/DataBinding/data-token-suggestions";
import { DataTokenRef, mkDataToken } from "@/wab/commons/DataToken";
import { ProjectId } from "@/wab/shared/ApiSchema";

const PROJECT_ID = "proj-1" as ProjectId;

type Ctx = { paramName: string; ownerNames?: readonly string[] };

function ref(name: string, value = '""'): DataTokenRef {
  return { token: mkDataToken({ name, value }), projectId: PROJECT_ID };
}

/**
 * Names suggested for an *empty* input, best match first — the heuristic path
 * of {@link getDataTokenSuggestions}
 */
function suggested(names: string[], ctx: Ctx): string[] {
  return getDataTokenSuggestions(
    names.map((n) => ref(n)),
    {
      paramName: ctx.paramName,
      ownerNames: ctx.ownerNames ?? [],
      searchText: "",
    }
  ).map((r) => r.token.name);
}

/**
 * Names in ranked order for a typed query
 */
function search(
  names: string[],
  ctx: Ctx & { query: string; valueMatches?: string[] }
): string[] {
  const valueOnly = new Set(ctx.valueMatches ?? []);
  const tokens = names.map((n) =>
    ref(n, valueOnly.has(n) ? `"${ctx.query}"` : '""')
  );
  return getDataTokenSuggestions(tokens, {
    paramName: ctx.paramName,
    ownerNames: ctx.ownerNames ?? [],
    searchText: ctx.query,
  }).map((r) => r.token.name);
}

describe("getDataTokenSuggestions", () => {
  describe("empty query (name/owner heuristic)", () => {
    // We are editing the `apiKey` param of the `getUser` function.
    const ctx: Ctx = { paramName: "apiKey", ownerNames: ["getUser"] };

    it("suggests a token whose name is the param name", () => {
      expect(suggested(["apiKey"], ctx)).toEqual(["apiKey"]);
    });

    it("suggests a token that contains the param name", () => {
      expect(suggested(["stripeApiKey"], ctx)).toEqual(["stripeApiKey"]);
    });

    it("does not suggest a token missing a word of the param name", () => {
      // "apiSecret" has "api" but not "key"; "baseUrl" shares nothing.
      expect(suggested(["apiSecret", "baseUrl"], ctx)).toEqual([]);
    });

    it("does not suggest a token that matches only the owner", () => {
      expect(suggested(["getUser"], ctx)).toEqual([]);
    });

    it("ranks an (owner + param) match above a plain param match", () => {
      expect(suggested(["apiKey", "getUser.apiKey"], ctx)).toEqual([
        "getUser.apiKey",
        "apiKey",
      ]);
    });

    it("ranks an exact param match above one that only contains it", () => {
      expect(suggested(["apiKeyProd", "apiKey"], ctx)).toEqual([
        "apiKey",
        "apiKeyProd",
      ]);
    });

    it("sorts equally strong matches by name", () => {
      expect(suggested(["stripeApiKey", "apiKeyProd"], ctx)).toEqual([
        "apiKeyProd",
        "stripeApiKey",
      ]);
    });

    it("ignores separators and casing when matching", () => {
      expect(suggested(["get_user_api_key", "API_KEY"], ctx)).toEqual([
        "get_user_api_key",
        "API_KEY",
      ]);
    });

    it("matches the owner words in any order", () => {
      expect(suggested(["apiKey", "apiKeyGetUser"], ctx)).toEqual([
        "apiKeyGetUser",
        "apiKey",
      ]);
    });

    it("ranks by how many owner words are shared", () => {
      // Editing `host` on the "Strapi Query" function: "strapiQueryHost"
      // shares both owner words, "strapiHost" one, "apiHost" none.
      const strapi: Ctx = { paramName: "host", ownerNames: ["Strapi Query"] };
      expect(
        suggested(["apiHost", "strapiHost", "strapiQueryHost"], strapi)
      ).toEqual(["strapiQueryHost", "strapiHost", "apiHost"]);
    });

    it("ranks a partial-owner match above a generic exact param match", () => {
      const strapi: Ctx = { paramName: "host", ownerNames: ["Strapi Query"] };
      expect(suggested(["host", "strapiHost"], strapi)).toEqual([
        "strapiHost",
        "host",
      ]);
    });

    it("applies no owner boost when there is no owner", () => {
      expect(
        suggested(["getUser.apiKey", "apiKey"], { paramName: "apiKey" })
      ).toEqual(["apiKey", "getUser.apiKey"]);
    });

    it("excludes tokens that don't match the param", () => {
      expect(suggested(["apiKey", "baseUrl", "timeout"], ctx)).toEqual([
        "apiKey",
      ]);
    });

    it("suggests nothing when the param name is empty", () => {
      expect(suggested(["apiKey", "baseUrl"], { paramName: "" })).toEqual([]);
    });

    it("ranks tokens by the most specific owner name they echo", () => {
      // A Button instance named "Submit", inside a "Checkout Form" component.
      expect(
        suggested(
          [
            "label",
            "checkoutFormLabel",
            "buttonLabel",
            "submitLabel",
            "submitButtonLabel",
          ],
          {
            paramName: "label",
            ownerNames: ["Submit", "Button", "Checkout Form"],
          }
        )
      ).toEqual([
        "submitButtonLabel",
        "submitLabel",
        "buttonLabel",
        "checkoutFormLabel",
        "label",
      ]);
    });

    it("outranks every word of a later name with one word of an earlier one", () => {
      // All five words of the second name lose to the single word of the first.
      expect(
        suggested(["productCardImageGalleryItemLabel", "submitLabel"], {
          paramName: "label",
          ownerNames: ["Submit", "Product Card Image Gallery Item"],
        })
      ).toEqual(["submitLabel", "productCardImageGalleryItemLabel"]);
    });

    describe("unspaced scripts", () => {
      it("matches Chinese", () => {
        expect(
          suggested(["品牌颜色", "主要颜色"], { paramName: "颜色" })
        ).toEqual(["主要颜色", "品牌颜色"]);
        expect(
          suggested(["品牌颜色", "主要颜色"], { paramName: "品牌" })
        ).toEqual(["品牌颜色"]);
      });

      it("matches Thai and Japanese", () => {
        expect(suggested(["สีแบรนด์"], { paramName: "แบรนด์" })).toEqual([
          "สีแบรนด์",
        ]);
        expect(suggested(["ブランドカラー"], { paramName: "カラー" })).toEqual([
          "ブランドカラー",
        ]);
      });

      it("still requires a shared word", () => {
        expect(suggested(["主要颜色"], { paramName: "品牌" })).toEqual([]);
      });
    });
  });

  describe("typed query (search by name/value)", () => {
    // Editing the `host` param of the "Strapi Query" function.
    const ctx: Ctx = { paramName: "host", ownerNames: ["Strapi Query"] };

    it("ranks name matches over value matches, each by heuristic then alphabetically", () => {
      expect(
        search(
          [
            "urlHost",
            "strapiUrlHost",
            "host",
            "strapiHost",
            "config",
            "backup",
          ],
          {
            ...ctx,
            query: "url",
            valueMatches: ["host", "strapiHost", "config", "backup"],
          }
        )
      ).toEqual([
        "strapiUrlHost",
        "urlHost",
        "strapiHost",
        "host",
        "backup",
        "config",
      ]);
    });

    it("drops tokens that match neither name nor value", () => {
      expect(search(["hostUrl", "timeout"], { ...ctx, query: "host" })).toEqual(
        ["hostUrl"]
      );
    });

    it("keeps a token whose value (not name) matches the query", () => {
      expect(
        search(["prodHost"], {
          paramName: "host",
          query: "api",
          valueMatches: ["prodHost"],
        })
      ).toEqual(["prodHost"]);
    });
  });
});
