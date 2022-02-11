import {
  PlasmicCanvasContext,
  repeatedElement,
  DataProvider,
  useSelector,
} from "@plasmicapp/host";
import registerComponent, {
  CanvasComponentProps,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { usePlasmicQueryData } from "@plasmicapp/query";
import React, {
  createContext,
  CSSProperties,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export const tuple = <T extends any[]>(...args: T): T => args;

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

interface QueryParams {
  collection_handle?: string;
  first: number;
  reverse?: boolean;
  query?: string;
  product_filters?: ProductFilter[];
}

interface ProductFilter {
  // TODO: Allow filtering by productType and vendor
  // productType?: string;
  // productVendor?: string;
  available?: boolean;
  price?: {
    min?: number;
    max?: number;
  };
  variantOption?: {
    name?: string;
    value?: string;
  };
}

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
      }
    }
  }
  onlineStoreUrl
  options {
    name
    values
  }
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
    maxVariantPrice {
      amount
      currencyCode
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
        selectedOptions {
          name
          value
        }
      }
    }
  }
  vendor
}
`;

const buildProductsQuery = (params: QueryParams) => {
  const products = `
    products(first: $first, sortKey: $sortKey, reverse: $reverse${
      params.collection_handle
        ? ", filters: $product_filters"
        : ", query: $query"
    }) {
      edges {
        node {
          ...ProductFragment
        }
      }
    }
`;
  let query = products;
  if (params.collection_handle) {
    query = `
  collectionByHandle(handle:$collection_handle){
    ${products}
  }
`;
  }
  return `
query Products($first: Int!, $sortKey: ${
    params.collection_handle ? "ProductCollectionSortKeys" : "ProductSortKeys"
  }, $reverse: Boolean${
    params.collection_handle
      ? ", $collection_handle: String!, $product_filters: [ProductFilter!]"
      : ", $query: String"
  }) {
  ${query}
}

${productFragment}
`;
};

const buildProductQuery = (
  productIdOrHandle:
    | { id: string; handle?: undefined }
    | { id?: undefined; handle: string }
) => {
  if (productIdOrHandle.id) {
    return `
      query Product($id: ID!) {
        product(id: $id) {
          ...ProductFragment
        }
      }

      ${productFragment}
  `;
  }
  return `
    query Product($handle: String!) {
      productByHandle(handle: $handle) {
        ...ProductFragment
      }
    }

    ${productFragment}
  `;
};

const getCollectionsQuery = `
  query getSiteCollections($first: Int!, $sortKey: CollectionSortKeys, $reverse: Boolean) {
    collections(first: $first, sortKey: $sortKey, reverse: $reverse) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`;

export interface ProductData {
  availableForSale: boolean;
  collections: {
    edges: {
      node: {
        handle: string;
      };
    }[];
  };
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
    maxVariantPrice: { amount: string; currencyCode: string };
    minVariantPrice: { amount: string; currencyCode: string };
  };
  productType: string;
  publishedAt: string;
  seo: { title: string; description: string };
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
  vendor: string;
}

const CredentialsContext = React.createContext<
  ShopifyCredentialsProviderProps | undefined
>(undefined);

interface ShopifyCredentialsProviderProps {
  shop: string;
  storefrontAccessToken: string;
}

export interface CollectionInfo {
  id: string;
  handle: string;
  title: string;
}

export interface ProductInfo {
  handle: string;
  title: string;
}

export interface ShopInfo {
  collections: CollectionInfo[];
  products: ProductInfo[];
}

export const ShopInfoContext = createContext<ShopInfo | undefined>(undefined);

function useFetch<T>(key: string, fetch: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  useEffect(() => {
    fetch().then(res => setData(res));
  }, [key]);
  return data;
}

function ShopInfoFetcher({ children }: { children: ReactNode }) {
  const creds = ensure(useContext(CredentialsContext));
  const shopInfo = useFetch<ShopInfo>("", async () => {
    // 250 is the max.
    // We sort for most recently updated first.
    const collections = await graphqlQuery(
      creds.shop,
      creds.storefrontAccessToken,
      {
        query: getCollectionsQuery,
        variables: {
          first: 250,
          sortKeys: "UPDATED_AT",
          reverse: true,
        },
      }
    );
    // We could request just the needed data here.
    const products = await graphqlQuery(
      creds.shop,
      creds.storefrontAccessToken,
      {
        query: buildProductsQuery({
          first: 250,
        }),
        variables: {
          first: 250,
          sortKeys: "UPDATED_AT",
          reverse: true,
        },
      }
    );
    const collectionEdges: { node: CollectionInfo }[] =
      collections?.data?.collections.edges ?? [];
    const productEdges: { node: ProductData }[] =
      (products?.data).products.edges ?? [];
    return {
      collections: collectionEdges.map(edge => edge.node),
      products: productEdges.map(edge => edge.node),
    };
  });
  return (
    <ShopInfoContext.Provider value={shopInfo}>
      {children}
    </ShopInfoContext.Provider>
  );
}

export function ShopifyCredentialsProvider({
  shop,
  storefrontAccessToken,
  children,
}: React.PropsWithChildren<ShopifyCredentialsProviderProps>) {
  if (!shop || !storefrontAccessToken) {
    return (
      <div>
        Missing shopify information. Please provide the <code>shop</code> and
        storefront access token.
      </div>
    );
  }
  const inEditor = useContext(PlasmicCanvasContext);
  return (
    <CredentialsContext.Provider value={{ shop, storefrontAccessToken }}>
      {inEditor ? <ShopInfoFetcher>{children}</ShopInfoFetcher> : children}
    </CredentialsContext.Provider>
  );
}

async function graphqlQuery(
  shop: string,
  storefrontAccessToken: string,
  body: { variables: {}; query: string }
) {
  const response = await fetch(`https://${shop}/api/2022-01/graphql.json`, {
    headers: {
      accept: "*/*",
      "content-type": "application/json",
      "x-shopify-storefront-access-token": storefrontAccessToken,
    },
    referrer: "https://shopify.dev/",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: JSON.stringify(body),
    method: "POST",
    mode: "cors",
    credentials: "omit",
  });
  return await response.json();
}

function useProductCollectionData(
  shop: string,
  storefrontAccessToken: string,
  params: QueryParams
) {
  const maybeData = usePlasmicQueryData(
    JSON.stringify([shop, storefrontAccessToken, params]),
    async () => {
      const data = await graphqlQuery(shop, storefrontAccessToken, {
        query: buildProductsQuery(params),
        variables: params,
      });
      const productEdges:
        | undefined
        | { node: ProductData }[] = (params.collection_handle
        ? data?.data.collectionByHandle
        : data?.data
      ).products.edges;
      return productEdges?.map(edge => edge.node);
    }
  );
  return maybeData;
}

function useProductData(
  shop: string,
  storefrontAccessToken: string,
  productIdOrHandle:
    | { id: string; handle?: undefined }
    | { id?: undefined; handle: string }
) {
  const maybeData = usePlasmicQueryData(
    JSON.stringify([shop, storefrontAccessToken, productIdOrHandle]),
    async () => {
      const data = await graphqlQuery(shop, storefrontAccessToken, {
        query: buildProductQuery(productIdOrHandle),
        variables: productIdOrHandle,
      });
      return (productIdOrHandle.id
        ? data?.data?.product
        : data?.data?.productByHandle) as ProductData | undefined;
    }
  );
  return maybeData;
}

const contextKey = "__shopifyProduct";

interface ProductCollectionProps extends CanvasComponentProps<ShopInfo> {
  children?: ReactNode;
  count?: number;
  reverse?: boolean;
  query?: string;
  collectionHandle?: string;
  // productType?: string;
  // productVendor?: string;
  available?: boolean;
  minPrice?: number;
  maxPrice?: number;
  variantOptions?: {
    name?: string;
    value?: string;
  }[];
}

export function ProductCollection({
  children,
  count = 10,
  reverse,
  query,
  collectionHandle,
  // productType,
  // productVendor,
  available,
  minPrice,
  maxPrice,
  variantOptions,
  setControlContextData,
}: ProductCollectionProps) {
  const context = React.useContext(CredentialsContext);
  if (!context) {
    throw new Error(
      "Shopify products must be wrapped in `Shopify Credentials Provider`"
    );
  }

  const shopInfo = useContext(ShopInfoContext);
  if (shopInfo) {
    setControlContextData?.(shopInfo);
  }

  const shop = context.shop;
  const storefrontAccessToken = context.storefrontAccessToken;
  const params: QueryParams = { first: count, product_filters: [] };
  if (collectionHandle != null) {
    params.collection_handle = collectionHandle;
  }
  if (reverse != null) {
    params.reverse = reverse;
  }
  if (query != null && collectionHandle == null) {
    params.query = query;
  }
  // if (productType != null) {
  //   params.product_filters?.push({ productType });
  // }
  // if (productVendor != null) {
  //   params.product_filters?.push({ productVendor });
  // }
  if (available != null) {
    params.product_filters?.push({ available: available });
  }
  if (minPrice != null || maxPrice != null) {
    params.product_filters?.push({
      price: {
        ...(minPrice != null ? { min: minPrice } : {}),
        ...(maxPrice != null ? { max: maxPrice } : {}),
      },
    });
  }
  if (variantOptions != null) {
    variantOptions.forEach(opt =>
      params.product_filters?.push({ variantOption: opt })
    );
  }
  if (collectionHandle == null || params.product_filters?.length === 0) {
    delete params.product_filters;
  }

  const maybeData = useProductCollectionData(
    shop,
    storefrontAccessToken,
    params
  );

  if ("error" in maybeData) {
    return <div>Error: {maybeData.error?.message}</div>;
  }
  if (!("data" in maybeData)) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {maybeData.data?.map?.((item, index) => (
        <DataProvider key={item.id} name={contextKey} data={item}>
          {repeatedElement(index === 0, children)}
        </DataProvider>
      ))}
    </>
  );
}

interface ShopifyProductProps extends CanvasComponentProps<ShopInfo> {
  children?: ReactNode;
  handle?: string;
  id?: string;
}

export function ShopifyProduct({
  children,
  handle,
  id,
  setControlContextData,
}: ShopifyProductProps) {
  const context = React.useContext(CredentialsContext);
  if (!context) {
    throw new Error(
      "Shopify products must be wrapped in `Shopify Credentials Provider`"
    );
  }
  const shopInfo = useContext(ShopInfoContext);
  if (shopInfo) {
    setControlContextData?.(shopInfo);
  }
  const shop = context.shop;
  const storefrontAccessToken = context.storefrontAccessToken;

  let maybeData: { error?: Error; data?: ProductData };
  if (id) {
    maybeData = useProductData(shop, storefrontAccessToken, { id });
  } else if (handle) {
    maybeData = useProductData(shop, storefrontAccessToken, { handle });
  } else {
    throw new Error("Please specify either the product handle or product ID");
  }

  if ("error" in maybeData) {
    return <div>Error: {maybeData.error?.message}</div>;
  }
  if (!("data" in maybeData)) {
    return <div>Loading...</div>;
  }
  const product = maybeData.data;

  return (
    <DataProvider name={contextKey} data={product}>
      {children}
    </DataProvider>
  );
}

const dataUnavailableError = <>(No product data available)</>;

function useProduct() {
  return useSelector(contextKey) as ProductData | undefined;
}

export interface ProductTitleProps {
  className?: string;
  style?: CSSProperties;
}

export function ProductTitle({ className, style }: ProductTitleProps) {
  const product = useProduct();
  return (
    <div className={className} style={style}>
      {product?.title ?? dataUnavailableError}
    </div>
  );
}

export interface ProductPriceProps {
  className?: string;
  style?: CSSProperties;
  showCurrency?: boolean;
}

export function ProductPrice({
  className,
  style,
  showCurrency,
}: ProductPriceProps) {
  const product = useProduct();
  const price = product?.priceRange.maxVariantPrice;
  return (
    <div className={className} style={style}>
      {price
        ? `${price.amount}` + `${showCurrency ? ` ${price.currencyCode}` : ""}`
        : dataUnavailableError}
    </div>
  );
}

export interface ProductImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement>,
    CanvasComponentProps<{ length: number }> {
  imageIndex?: number;
  placeholder?: string;
  placeholderWidth?: number;
  placeholderHeight?: number;
}

export function ProductImage({
  imageIndex = 0,
  style,
  className,
  placeholder = "https://studio.plasmic.app/static/img/placeholder.png",
  placeholderWidth = 80,
  placeholderHeight = 60,
  setControlContextData,
  ...props
}: ProductImageProps) {
  const product = useProduct();
  if (!product) {
    return (
      <div className={className} style={style}>
        {dataUnavailableError}
      </div>
    );
  }
  const imageCount = product.images?.edges?.length ?? 0;
  setControlContextData?.({ length: imageCount });
  const image =
    product.images?.edges?.[imageIndex >= imageCount ? 0 : imageIndex]?.node;
  return (
    <img
      alt={product.title}
      loading={"lazy"}
      {...props}
      src={image?.transformedSrc ?? placeholder}
      width={image?.width ?? placeholderWidth}
      height={image?.height ?? placeholderHeight}
      className={className}
      style={{
        objectFit: "cover",
        ...(style ?? {}),
      }}
    />
  );
}

const thisModule = "@plasmicpkgs/plasmic-shopify";

export const productCollectionMeta: ComponentMeta<ProductCollectionProps> = {
  name: "shopify-product-collection",
  importName: "ProductCollection",
  displayName: "Product Collection",
  importPath: thisModule,
  props: {
    count: {
      type: "number",
      displayName: "Product Count",
      description: "The number of products to display",
      defaultValueHint: 10,
      max: 250,
      min: 1,
    },
    reverse: {
      type: "boolean",
      displayName: "Reverse",
      defaultValueHint: false,
      description: "Reverse the list order",
    },
    query: {
      type: "string",
      displayName: "Query",
      description: "Query string that uses Shopify's search syntax",
      hidden: props => props.collectionHandle != null,
    },
    collectionHandle: {
      type: "choice",
      displayName: "Collection Handle",
      description: "The handle of the Collection",
      options: (_props, shopInfo: ShopInfo | null) =>
        shopInfo?.collections.map(c => ({
          value: c.handle,
          label: c.title,
        })) ?? [],
    },
    // productType: {
    //   type: "string",
    //   displayName: "Product Type",
    //   description: "Filter results by Product Type",
    //   hidden: (props) => props.collectionHandle == null,
    // },
    // productVendor: {
    //   type: "string",
    //   displayName: "Product Vendor",
    //   description: "Filter results by Product Vendor",
    //   hidden: (props) => props.collectionHandle == null,
    // },
    available: {
      type: "boolean",
      displayName: "Available",
      description: "Filter products by availability",
      hidden: props => props.collectionHandle == null,
    },
    minPrice: {
      type: "number",
      displayName: "Min Price",
      description: "Filter products by price range",
      hidden: props => props.collectionHandle == null,
    },
    maxPrice: {
      type: "number",
      displayName: "Max Price",
      description: "Filter products by price range",
      hidden: props => props.collectionHandle == null,
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: "shopify-product-title",
          },
          {
            type: "component",
            name: "shopify-product-image",
            styles: {
              width: "auto",
              height: "auto",
              maxWidth: "100%",
            },
          },
          {
            type: "component",
            name: "shopify-product-price",
          },
        ],
        styles: {
          width: "300px",
          maxWidth: "100%",
          alignItems: "center",
          rowGap: "20px",
        },
      },
    },
  },
};

export function registerProductCollection(
  loader?: { registerComponent: typeof registerComponent },
  customProductCollectionMeta?: ComponentMeta<ProductCollectionProps>
) {
  if (loader) {
    loader.registerComponent(
      ProductCollection,
      customProductCollectionMeta ?? productCollectionMeta
    );
  } else {
    registerComponent(
      ProductCollection,
      customProductCollectionMeta ?? productCollectionMeta
    );
  }
}

export const shopifyCredentialsProviderMeta: ComponentMeta<ShopifyCredentialsProviderProps> = {
  name: "shopify-credentials-provider",
  importName: "ShopifyCredentialsProvider",
  displayName: "Credentials Provider",
  props: {
    shop: {
      type: "string",
      description:
        "The name of the Shopify store, usually a domain like something.myshopify.com. (graphql.myshopify.com is a demo store.)",
      defaultValue: "graphql.myshopify.com",
    },
    // TODO Make this a custom control that has a link to the docs.
    storefrontAccessToken: {
      type: "string",
      description:
        "The storefront API access token. Follow instructions here to get one: https://docs.plasmic.app/learn/shopify-storefront-access-token",
      defaultValue: "ecdc7f91ed0970e733268535c828fbbe",
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "text",
            tag: "h2",
            value: "Single Product",
          },
          {
            type: "component",
            name: "shopify-product",
          },
          {
            type: "text",
            tag: "h2",
            value: "Product Collection",
            styles: {
              marginTop: "30px",
            },
          },
          {
            type: "hbox",
            children: {
              type: "component",
              name: "shopify-product-collection",
              props: {
                count: 8,
                collectionHandle: "casual-things",
              },
            },
            styles: {
              alignItems: "stretch",
              justifyContent: "space-between",
              flexWrap: "wrap",
            },
          },
        ],
        styles: {
          alignItems: "center",
        },
      },
    },
  },
  importPath: thisModule,
};

export function registerShopifyCredentialsProvider(
  loader?: { registerComponent: typeof registerComponent },
  customShopifyCredentialsProviderMeta?: ComponentMeta<
    ShopifyCredentialsProviderProps
  >
) {
  if (loader) {
    loader.registerComponent(
      ShopifyCredentialsProvider,
      customShopifyCredentialsProviderMeta ?? shopifyCredentialsProviderMeta
    );
  } else {
    registerComponent(
      ShopifyCredentialsProvider,
      customShopifyCredentialsProviderMeta ?? shopifyCredentialsProviderMeta
    );
  }
}

export const shopifyProductMeta: ComponentMeta<ShopifyProductProps> = {
  name: "shopify-product",
  displayName: "Shopify Product",
  importName: "ShopifyProduct",
  importPath: thisModule,
  props: {
    handle: {
      type: "choice",
      displayName: "Product Handle",
      description: "The handle of the product",
      defaultValue: "monte-shirt",
      options: (_props, shopInfo: ShopInfo | null) =>
        shopInfo?.products.map(p => ({
          value: p.handle,
          label: p.title,
        })) ?? [],
    },
    id: {
      type: "string",
      displayName: "Product ID",
      description: "The ID of the product",
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: "shopify-product-title",
          },
          {
            type: "component",
            name: "shopify-product-image",
            styles: {
              width: "auto",
              height: "auto",
              maxWidth: "100%",
            },
          },
          {
            type: "component",
            name: "shopify-product-price",
          },
        ],
        styles: {
          width: "300px",
          maxWidth: "100%",
          alignItems: "center",
          rowGap: "20px",
        },
      },
    },
  },
};

export function registerShopifyProduct(
  loader?: { registerComponent: typeof registerComponent },
  customShopifyProductMeta?: ComponentMeta<ShopifyProductProps>
) {
  if (loader) {
    loader.registerComponent(
      ShopifyProduct,
      customShopifyProductMeta ?? shopifyProductMeta
    );
  } else {
    registerComponent(
      ShopifyProduct,
      customShopifyProductMeta ?? shopifyProductMeta
    );
  }
}

export const productTitleMeta: ComponentMeta<ProductTitleProps> = {
  name: "shopify-product-title",
  importName: "ProductTitle",
  displayName: "Product Title",
  props: {},
  importPath: thisModule,
};

export function registerProductTitle(
  loader?: { registerComponent: typeof registerComponent },
  customProductTitleMeta?: ComponentMeta<ProductTitleProps>
) {
  if (loader) {
    loader.registerComponent(
      ProductTitle,
      customProductTitleMeta ?? productTitleMeta
    );
  } else {
    registerComponent(ProductTitle, customProductTitleMeta ?? productTitleMeta);
  }
}

export const productPriceMeta: ComponentMeta<ProductPriceProps> = {
  name: "shopify-product-price",
  importName: "ProductPrice",
  displayName: "Product Price",
  props: {
    showCurrency: {
      type: "boolean",
      displayName: "Show Currency",
      description: "Whether the currency code should be displayed",
      defaultValueHint: false,
    },
  },
  importPath: thisModule,
};

export function registerProductPrice(
  loader?: { registerComponent: typeof registerComponent },
  customProductPriceMeta?: ComponentMeta<ProductPriceProps>
) {
  if (loader) {
    loader.registerComponent(
      ProductPrice,
      customProductPriceMeta ?? productPriceMeta
    );
  } else {
    registerComponent(ProductPrice, customProductPriceMeta ?? productPriceMeta);
  }
}

export const productImageMeta: ComponentMeta<ProductImageProps> = {
  name: "shopify-product-image",
  importName: "ProductImage",
  displayName: "Product Image",
  props: {
    alt: {
      type: "string",
      displayName: "Alt",
      description:
        "HTML alt attribute to specify alternate text if the image cannot be displayed",
      defaultValueHint: "product.title",
    },
    loading: {
      type: "choice",
      options: ["eager", "lazy"],
      defaultValueHint: "lazy",
      displayName: "Loading",
      description:
        "HTML loading attribute to specify whether the browser should load an image immediately or to defer loading of off-screen images",
    },
    placeholder: {
      type: "imageUrl",
      displayName: "Placeholder Image",
      defaultValueHint: "https://studio.plasmic.app/static/img/placeholder.png",
      description:
        "Placeholder image to be used when the product image is not available",
    },
    placeholderHeight: {
      type: "number",
      displayName: "Placeholder Height",
      defaultValueHint: 60,
      description:
        "HTML height attribute to set the placeholder instrinsic height, if the product image is not available",
    },
    placeholderWidth: {
      type: "number",
      displayName: "Placeholder Width",
      defaultValueHint: 80,
      description:
        "HTML width attribute to set the placeholder instrinsic width, if the product image is not available",
    },
    imageIndex: {
      type: "number",
      displayName: "Image Index",
      defaultValueHint: 0,
      min: 0,
      max: (_props, data) => {
        if (!data?.length) {
          return Infinity;
        }
        return data.length - 1;
      },
      description: "The index of the product image to be displayed",
    },
  },
  defaultStyles: {
    width: "auto",
    height: "auto",
  },
  importPath: thisModule,
};

export function registerProductImage(
  loader?: { registerComponent: typeof registerComponent },
  customProductImageMeta?: ComponentMeta<ProductImageProps>
) {
  if (loader) {
    loader.registerComponent(
      ProductImage,
      customProductImageMeta ?? productImageMeta
    );
  } else {
    registerComponent(ProductImage, customProductImageMeta ?? productImageMeta);
  }
}

export function registerAllShopifyComponents(loader?: {
  registerComponent: typeof registerComponent;
}) {
  registerShopifyCredentialsProvider(loader);
  registerShopifyProduct(loader);
  registerProductCollection(loader);
  registerProductTitle(loader);
  registerProductPrice(loader);
  registerProductImage(loader);
}
