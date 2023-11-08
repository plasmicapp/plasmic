/**
 * Import and call this main instead of Shell's from main.tsx.
 */

import React from "react";
import ReactDOM from "react-dom";

export function main() {
  ReactDOM.render(<Sandbox />, document.querySelector(".app-container"));
}

function _Sandbox() {
  const env = {
    mydata: {
      found: 2,
      posts: [
        { id: 0, content: "Hello" },
        { id: 1, content: "Goodbye" },
      ],
    },
  };

  /*
  const wpQuery = mkRestQuery({
    method: "GET",
    url: "https://techcrunch.com/wp-json/wp/v2/posts",
  });

  // This is a throwaway user account.
  const airtableQuery = mkRestQuery({
    method: "GET",
    url: `https://api.airtable.com/v0/appiLAxbzdhzXA07b/Opportunities`,
  });
  airtableQuery.queryParams = [
    mkNameArg({ name: "maxRecords", expr: codeLit("3") }),
    mkNameArg({ name: "view", expr: codeLit("All opportunities") }),
  ];
  airtableQuery.authData = ensureType<AuthData>({
    type: "bearer",
    token: "keyk7NUNi8Puuphgq",
  });
  */

  /*
  From https://shopify.dev/graphiql/storefront-graphiql:

  curl 'https://graphql.myshopify.com/api/2021-04/graphql.json' \
  -H 'authority: graphql.myshopify.com' \
  -H 'pragma: no-cache' \
  -H 'cache-control: no-cache' \
  -H 'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"' \
  -H 'x-shopify-storefront-access-token: ecdc7f91ed0970e733268535c828fbbe' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36' \
  -H 'content-type: application/json' \
  -H 'accept: *\/*' \
  -H 'origin: https://shopify.dev' \
    -H 'sec-fetch-site: cross-site' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-dest: empty' \
  -H 'referer: https://shopify.dev/' \
  -H 'accept-language: en-US,en;q=0.9' \
  --data-raw '{"query":"{\n  shop {\n    name\n  }\n}","variables":null}' \
  --compressed
   */

  // This is our own development store:
  /*
  const shopifyQuery = mkRestQuery({
    method: "POST",
    url: `https://plasmic-sandbox.myshopify.com/api/2021-04/graphql.json`,
  });
  shopifyQuery.payload = `{"query":"{\\n  shop {\\n    name\\n  }\\n}","variables":null}`;
  shopifyQuery.authData = ensureType<AuthData>({
    type: "key",
    key: "x-shopify-storefront-access-token",
    value: "212bfc6ff92f971960bdca55dcc4aae7",
  });

  return (
    <div>
      <RestBuilder query={shopifyQuery} />
    </div>
  );
  */
  return null;
}

export const Sandbox = _Sandbox;
