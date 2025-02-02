import { Fetcher, FetcherError } from "@plasmicpkgs/commerce";
import { shopifyApiVersion } from "./graphql-config";

export const getFetcher: (
  storeDomain: string,
  accessToken: string
) => Fetcher = (storeDomain, accessToken) => {
  return async ({
    url = `https://${storeDomain}/api/${shopifyApiVersion}/graphql.json`,
    method = "POST",
    variables,
    query,
  }) => {
    const { locale, ...vars } = variables ?? {};
    const res = await fetch(url, {
      method,
      body: JSON.stringify({ query, variables: vars }),
      headers: {
        "X-Shopify-Storefront-Access-Token": accessToken,
        "Content-Type": "application/json",
        ...(locale && {
          "Accept-Language": locale,
        }),
      },
    });
    if (res.ok) {
      const { data, errors } = await res.json();
      if (errors && errors.length) {
        throw getError(errors, res.status);
      }

      return data;
    } else {
      const { errors } = await res.json();
      throw getError(errors, res.status);
    }
  };
};

function getError(errors: any[] | null, status: number) {
  errors = errors ?? [{ message: "Failed to fetch Shopify API" }];
  return new FetcherError({ errors, status });
}
