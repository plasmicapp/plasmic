import registerComponent from "@plasmicapp/host/registerComponent";
import React, { ReactNode, useEffect, useState } from "react";
import {
  DynamicCollectionGrid,
  dynamicCollectionGridProps,
  useSelector,
} from "../../plasmic-basic-components/src/Data";

const productFragment = `
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
`;

const allProductsQuery = `
query Products($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
  products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges {
      node {
        ...ProductFragment
      }
    }
  }
}

${productFragment}
`;

const collectionQuery = `
query Collection($handle:String!){
  collectionByHandle(handle:$handle){
    products(first:99){
      edges{
        node{
          ...ProductFragment
        }
      }
    }
  }
}

${productFragment}
`;

export interface ProductData {
  availableForSale: boolean;
  createdAt: string;
  description: string;
  descriptionHtml: string;
  handle: string;
  id: string;
  images: {
    edges: {
      node: {
        id: string;
        transformedSrc: string;
        width: number;
        height: number;
      };
    }[];
  };
  onlineStoreUrl: string;
  options: { name: string; values: string[] }[];
  priceRange: {
    maxVariantPrice: { amount: string };
    minVariantPrice: { amount: string };
  };
  productType: string;
  publishedAt: string;
  seo: { title: null; description: null };
  title: string;
  updatedAt: string;
  variants: {
    edges: {
      node: {
        availableForSale: boolean;
        currentlyNotInStock: boolean;
        id: string;
        image: {
          id: string;
          transformedSrc: string;
          width: number;
          height: number;
        };
        priceV2: { amount: string };
        requiresShipping: boolean;
        sku: string;
        title: string;
        unitPrice: boolean;
      };
    }[];
  };
}

interface ProductCollectionGridProps {
  children?: ReactNode;
  className?: string;
  columns?: number;
  columnGap?: number;
  rowGap?: number;
  count?: number;
  collectionHandle?: string;
}

const allProductsCollection = "__ALL__";

// TODO replace with react-query
function useProductCollectionData(
  collectionHandle: string | undefined,
  count?: number
) {
  const [data, setData] = useState<ProductData[] | undefined>(undefined);
  useEffect(() => {
    (async () => {
      if (!collectionHandle) {
        return;
      }
      const response = await fetch(
        "https://graphql.myshopify.com/api/2021-04/graphql.json",
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "sec-ch-ua":
              '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "x-shopify-storefront-access-token":
              "ecdc7f91ed0970e733268535c828fbbe",
          },
          referrer: "https://shopify.dev/",
          referrerPolicy: "strict-origin-when-cross-origin",
          body:
            collectionQuery !== allProductsCollection
              ? JSON.stringify({
                  query: collectionQuery,
                  variables: { handle: collectionHandle },
                })
              : JSON.stringify({
                  query: allProductsQuery,
                  variables: { first: 99 },
                }),

          method: "POST",
          mode: "cors",
          credentials: "omit",
        }
      );
      const data = await response.json();
      const productEdges: undefined | { node: ProductData }[] =
        collectionQuery !== allProductsCollection
          ? data?.data.collectionByHandle.products.edges
          : data?.data.products.edges;
      setData(
        productEdges
          ?.map((edge) => edge.node)
          .filter((product) =>
            collectionHandle === "winter-things"
              ? product.title.match(/Shirt|Cardigan|Jumper|Boot/)
              : collectionHandle === "outerwear"
              ? product.title.match(/Jumper/)
              : collectionHandle === "boots"
              ? product.productType === "Boots"
              : true
          )
          .slice(0, count)
      );
    })();
  }, [collectionHandle, count]);
  return data;
}

const contextKey = "__shopifyProduct";

export function ProductCollectionGrid({
  collectionHandle,
  count,
  ...props
}: ProductCollectionGridProps) {
  const products = useProductCollectionData(collectionHandle, count);
  return (
    <DynamicCollectionGrid
      {...props}
      data={products}
      loopItemName={contextKey}
      keySelector={"id"}
    />
  );
}

const dataUnavailableError = <>(No product data available)</>;

function useProduct() {
  return useSelector(contextKey);
}

export function ProductTitle({ className }: { className?: string }) {
  const product = useProduct();
  return (
    <div className={className}>{product?.title ?? dataUnavailableError}</div>
  );
}

export function ProductPrice({ className }: { className?: string }) {
  const product = useProduct();
  return (
    <div className={className}>
      ${product?.priceRange.maxVariantPrice.amount ?? dataUnavailableError}
    </div>
  );
}

export function ProductImage({ className }: { className?: string }) {
  const product = useProduct();
  if (!product) {
    return <div className={className}>{dataUnavailableError}</div>;
  }
  const image = product.images.edges[0].node;
  return (
    <img
      alt={product.title}
      src={image.transformedSrc}
      width={image.width}
      height={image.height}
      loading={"lazy"}
      className={className}
      style={{
        objectFit: "cover",
      }}
    />
  );
}

const { columns, columnGap, rowGap, children } = dynamicCollectionGridProps;

const thisModule = "@plasmicpkgs/plasmic-shopify/ProductData";

registerComponent(ProductCollectionGrid, {
  name: "ProductCollectionGrid",
  importPath: thisModule,
  props: {
    collectionHandle: {
      type: "string",
      description: "The handle of the product collection to display",
    },
    count: {
      type: "number",
      description: "The number of products to display",
    },
    columns,
    columnGap,
    rowGap,
    children,
  },
});

registerComponent(ProductTitle, {
  name: "ProductTitle",
  importPath: thisModule,
  props: {},
});

registerComponent(ProductImage, {
  name: "ProductImage",
  importPath: thisModule,
  props: {},
});

registerComponent(ProductPrice, {
  name: "ProductPrice",
  importPath: thisModule,
  props: {},
});
