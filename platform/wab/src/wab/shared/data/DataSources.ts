import { asReadablePromise } from "@/wab/commons/control";
import { Dict } from "@/wab/shared/collections";
import { uncheckedCast, unexpected } from "@/wab/shared/common";
import { LowerHttpMethod } from "@/wab/shared/HttpClientUtil";
import SwaggerParser, { ResolverOptions } from "@apidevtools/swagger-parser";
import memoizeOne from "memoize-one";
import type { JsonPrimitive } from "type-fest";

export interface GraphqlExample {
  sourceName: string;
  queryName: string;
  aboutUrl: string;
  url: string;
  query: string;
  headers?: Dict<string>;
  variables?: Dict<JsonPrimitive>;
}

export const graphqlExamples: GraphqlExample[] = [
  {
    sourceName: "The Movie Database",
    queryName: "Get trending movies",
    aboutUrl: "https://www.themoviedb.org/",
    url: "https://tmdb.apps.quintero.io/",
    query: `
{
  movies {
    trending {
      totalCount
      edges {
        node {
          id
          rating
          title
          releaseDate
          numberOfRatings
        }
      }
    }
  }
}
    `,
  },
  {
    sourceName: "GitLab",
    queryName: "Get top-starred repos",
    aboutUrl: "https://docs.gitlab.com/ee/api/graphql/",
    url: "https://gitlab.com/api/graphql",
    query: `
{
  projects(last: 10) {
    nodes {
      name
      nameWithNamespace
      createdAt
      description
      starCount
      forksCount
      lastActivityAt
    }
  }
}
    `,
  },
  {
    sourceName: "Shopify (public example store)",
    queryName: "Get all products",
    aboutUrl: "https://shopify.dev/docs/storefront-api/reference",
    url: "https://graphql.myshopify.com/api/2021-04/graphql.json",
    headers: {
      "x-shopify-storefront-access-token": "ecdc7f91ed0970e733268535c828fbbe",
    },
    variables: {
      first: 10,
    },
    query: `
query Products($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
  products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges {
      node {
        ...ProductFragment
      }
    }
  }
}

fragment ProductFragment on Product {
  availableForSale
  collections(first: 5) {
    edges {
      node {
        handle
      }
    }
  }
  createdAt
  description
  descriptionHtml
  handle
  id
  images(first: 5) {
    edges {
      node {
        id
        transformedSrc
        width
        height
      }
    }
  }
  metafield(key: "app_key", namespace: "affiliates") {
    description
  }
  metafields(first: 5) {
    edges {
      node {
        key
        description
        value
        valueType
      }
    }
  }
  onlineStoreUrl
  options {
    name
    values
  }
  priceRange {
    maxVariantPrice {
      amount
    }
    minVariantPrice {
      amount
    }
  }
  productType
  publishedAt
  seo {
    title
    description
  }
  title
  updatedAt
  variants(first: 5) {
    edges {
      node {
        availableForSale
        currentlyNotInStock
        id
        image {
          id
          transformedSrc
          width
          height
        }
        priceV2 {
          amount
        }
        requiresShipping
        sku
        title
        unitPrice {
          amount
        }
      }
    }
  }
}
    `,
  },
];

export const defaultGraphqlExample = graphqlExamples[0];

export interface AirtableSource {
  type: "AirtableSource";
  apiKey: string;
}

export interface ShopifySource {
  type: "ShopifySource";
  storefrontApiKey: string;
}

export type BuiltinDataSource = AirtableSource | ShopifySource;
export type BuiltinDataSourceName = BuiltinDataSource["type"];

export const dataSourceNameToHumanName = {
  AirtableSource: "Airtable",
  ShopifySource: "Shopify",
} as const;

export interface AirtableQuery {
  type: "AirtableQuery";
  baseId: string;
  endpointName: string;
  params: Dict<string>;
}

export interface WordpressQuery {
  type: "WordpressQuery";
  endpoint: string;
  baseUrl: string;
  params: Dict<string>;
}

export interface ShopifyQuery {
  type: "ShopifyQuery";
  baseUrl: string;
  query: string;
}

export type BuiltinDataSourceQuery = AirtableQuery | WordpressQuery;

export type OpenAPIType = "string" | "integer" | "array" | "boolean";
export interface EndpointSpec {
  summary: string;
  description?: string;
  externalDocs?: { url: string };
  parameters: {
    name: string;
    required: boolean;
    type: OpenAPIType;
    enum?: string[];
    description?: string;
  }[];
}
export interface SimpleOpenAPIV2Spec {
  paths: { [path: string]: { [method in LowerHttpMethod]?: EndpointSpec } };
}

export const wordpressSpec = memoizeOne(() =>
  asReadablePromise(
    (async () => {
      const { WordpressOpenapiRaw } = await import(
        "./api-specs/wordpress-openapi"
      );
      // Tell SwaggerParser to just read this string rather than open a file or
      // fetch a URL.
      const stringResolver: ResolverOptions = {
        order: 1,
        canRead: /.*/,
        async read(_file, _callback) {
          return WordpressOpenapiRaw.trim();
        },
      };
      const parsed: SimpleOpenAPIV2Spec = uncheckedCast(
        await SwaggerParser.dereference("foo.yml", {
          resolve: uncheckedCast<any>({
            str: stringResolver,
          }),
        })
      );
      return parsed;
    })()
  )
);

export function getBuiltinDataSourceSpec(
  type: BuiltinDataSourceQuery["type"]
): ReturnType<typeof wordpressSpec> {
  switch (type) {
    case "WordpressQuery":
      return wordpressSpec();
    case "AirtableQuery":
      return unexpected();
  }
}
