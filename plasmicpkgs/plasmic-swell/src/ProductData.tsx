import { PlasmicCanvasContext, repeatedElement } from "@plasmicapp/host";
import registerComponent, {
  CanvasComponentProps,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { usePlasmicQueryData } from "@plasmicapp/query";
import { DataProvider, useSelector } from "@plasmicpkgs/plasmic-basic-components";
import React, { CSSProperties, ReactNode, useContext } from "react";
const swell = require('swell-js');

interface QueryParams {
  collection_handle?: string;
  limit: number;
  page: number;
  category?: string;
  search?: string;
}

export interface ProductData {
  id: string,
  name: string,
  slug: string,
  currency: string,
  price: string,
  images: {
      id: string;
      caption: string;
      file: {
        id: string;
        width: number;
        height: number;
        url: string; 
      };
      height: number;
  }[];
};

const CredentialsContext = React.createContext<
  SwellCredentialsProviderProps | undefined
>(undefined);

interface SwellCredentialsProviderProps {
  storeId: string;
  publicKey: string;
}

export interface CategoryInfo {
  slug: string;
  name: string;
}

export interface ProductInfo {
  slug: string;
  name: string;
}

export interface ShopInfo {
  categories: CategoryInfo[];
  products: ProductInfo[];
}

export const ShopInfoContext = React.createContext<ShopInfo | undefined>(undefined);

function useShopInfoData(
  storeId: string,
  publicKey: string,
) {
  const maybeData = usePlasmicQueryData(JSON.stringify([storeId, publicKey]), async () => {
    // 100 is the max.
    const responseCategories = await swell.categories.list({
      limit: 100
    });
    const categories: CategoryInfo[] = responseCategories.results;
    const responseProducts = await swell.products.list({
      limit: 100
    });
    const products: ProductData[] = responseProducts.results;
    return {
      categories: categories,
      products: products,
    };
  });
  return maybeData;
}

function ShopInfoFetcher({ children }: { children: ReactNode }) {
  const context = React.useContext(CredentialsContext);
  if (!context) {
    throw new Error(
      "Shop Info Fetcher must be wrapped in `Swell Credentials Provider`"
    );
  }
  const storeId = context.storeId;
  const publicKey = context.publicKey;
  const maybeData = useShopInfoData(
    storeId,
    publicKey,
  );

  if ("error" in maybeData) {
    return <div>Error: {maybeData.error?.message}</div>;
  }
  if (!("data" in maybeData)) {
    return <div>Loading...</div>;
  }
  const shopInfo = maybeData.data;
  return (
    <ShopInfoContext.Provider value={shopInfo}>
      {children}
    </ShopInfoContext.Provider>
  );
}

export function SwellCredentialsProvider({
  storeId,
  publicKey,
  children,
}: React.PropsWithChildren<SwellCredentialsProviderProps>) {
  if (!storeId || !publicKey) {
    return (
      <div>
        Missing swell information. Please provide the <code>storeId</code> and
        public key.
      </div>
    );
  }
  swell.init(storeId, publicKey);
  const inEditor = React.useContext(PlasmicCanvasContext);
  return (
    <CredentialsContext.Provider value={{ storeId, publicKey }}>
      {inEditor ? <ShopInfoFetcher>{children}</ShopInfoFetcher> : children}
    </CredentialsContext.Provider>
  );
}


function useProductCollectionData(
  storeId: string,
  publicKey: string,
  params: QueryParams
) {
  const maybeData = usePlasmicQueryData(
    JSON.stringify([storeId, publicKey, params]),
    async () => {
      const response = await swell.products.list({
        limit: params.limit,
        page: params.page,
        category: params.category,
        search: params.search,
      });
      return response.results as ProductData[];
    }
  );
  return maybeData;
}

function useProductData(
  storeId: string,
  publicKey: string,
  productIdOrSlug: string,
) {
  const maybeData = usePlasmicQueryData(
    JSON.stringify([storeId, publicKey, productIdOrSlug]),
    async () => {
      const response = await swell.products.get(productIdOrSlug)
      return response as ProductData;
    }
  );
  return maybeData;
}

const contextKey = "__swellProduct";

interface ProductCollectionProps extends CanvasComponentProps<ShopInfo> {
  children?: ReactNode;
  limit?: number;
  page?: number;
  category?: string;
  search?: string;
}

export function ProductCollection({
  children,
  limit = 25, // max 100
  page = 1,
  category,
  search,
  setControlContextData,
}: ProductCollectionProps) {
  const context = React.useContext(CredentialsContext);
  if (!context) {
    throw new Error(
      "Swell products must be wrapped in `Swell Credentials Provider`"
    );
  }
  const shopInfo = useContext(ShopInfoContext);
  if (shopInfo) {
    setControlContextData?.(shopInfo);
  }
  const storeId = context.storeId;
  const publicKey = context.publicKey;
  const params: QueryParams = { limit, page, category, search };
  const maybeData = useProductCollectionData(
    storeId,
    publicKey,
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


interface SwellProductProps extends CanvasComponentProps<ShopInfo> {
  children?: ReactNode;
  product: string;
}

export function SwellProduct({ children, product, setControlContextData }: SwellProductProps) {
  const context = React.useContext(CredentialsContext);
  if (!context) {
    throw new Error(
      "Swell products must be wrapped in `Swell Credentials Provider`"
    );
  }
  const shopInfo = useContext(ShopInfoContext);
  if (shopInfo) {
    setControlContextData?.(shopInfo);
  }
  const storeId = context.storeId;
  const publicKey = context.publicKey;

  const maybeData = useProductData(storeId, publicKey, product);

  if ("error" in maybeData) {
    return <div>Error: {maybeData.error?.message}</div>;
  }
  if (!("data" in maybeData)) {
    return <div>Loading...</div>;
  }
  const productData = maybeData.data;

  return (
    <DataProvider name={contextKey} data={productData}>
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
      {product?.name ?? dataUnavailableError}
    </div>
  );
}


export interface ProductPriceProps {
  className?: string;
  style?: CSSProperties;
}

export function ProductPrice({
  className,
  style,
}: ProductPriceProps) {
  const product = useProduct();
  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: product?.currency ?? "USD"
  }).format(parseFloat(product?.price ?? "100"));
  return (
    <div className={className} style={style}>
      {product
        ? formattedPrice
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
  const imageCount = product.images?.length ?? 0;
  setControlContextData?.({ length: imageCount });
  const image =
    product.images?.[imageIndex >= imageCount ? 0 : imageIndex];
  return (
    <img
      alt={product.name}
      loading={"lazy"}
      {...props}
      src={image?.file.url ?? placeholder}
      width={image?.file.width ?? placeholderWidth}
      height={image?.file.height ?? placeholderHeight}
      className={className}
      style={{
        objectFit: "cover",
        ...(style ?? {}),
      }}
    />
  );
}

const thisModule = "@plasmicpkgs/plasmic-swell";


export const productCollectionMeta: ComponentMeta<ProductCollectionProps> = {
  name: "swell-product-collection",
  importName: "ProductCollection",
  displayName: "Product Collection",
  importPath: thisModule,
  props: {
    limit: {
      type: "number",
      displayName: "Product Count",
      description: "The number of products to display",
      defaultValueHint: 25,
      max: 100,
      min: 1,
    },
    page: {
      type: "number",
      displayName: "Page",
      description: "The page for the list",
      defaultValue: 1,
      min: 1,
    },
    category: {
      type: "choice",
      displayName: "Category",
      description: "Filter products by category",
      options: (_props, shopInfo: ShopInfo | null) =>
      shopInfo?.categories.map((c) => ({
        value: c.slug,
        label: c.name,
      })) ?? [],
    },
    search: {
      type: "string",
      displayName: "Search String",
      description: "Returns products matching the search query string."
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: "swell-product-title",
          },
          {
            type: "component",
            name: "swell-product-image",
            styles: {
              width: "auto",
              height: "auto",
              maxWidth: "100%",
            },
          },
          {
            type: "component",
            name: "swell-product-price",
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

export const swellCredentialsProviderMeta: ComponentMeta<SwellCredentialsProviderProps> = {
  name: "swell-credentials-provider",
  importName: "SwellCredentialsProvider",
  displayName: "Credentials Provider",
  props: {
    storeId: {
      type: "string",
      description:
        "Your swell store id. You can find it in your swell dashboard under Settings > API.",
      defaultValue: "my-store",
    },
    publicKey: {
      type: "string",
      description:
        "Your swell public key. You can find it in your swell dashboard under Settings > API.",
      defaultValue: "pk_md0JkpLnp9gBjkQ085oiebb0XBuwqZX9",
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
            name: "swell-product",
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
              name: "swell-product-collection",
              props: {
                limit: 8,
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

export function registerSwellCredentialsProvider(
  loader?: { registerComponent: typeof registerComponent },
  customSwellCredentialsProviderMeta?: ComponentMeta<SwellCredentialsProviderProps>
) {
  if (loader) {
    loader.registerComponent(
      SwellCredentialsProvider,
      customSwellCredentialsProviderMeta ?? swellCredentialsProviderMeta
    );
  } else {
    registerComponent(
      SwellCredentialsProvider,
      customSwellCredentialsProviderMeta ?? swellCredentialsProviderMeta
    );
  }
}

export const swellProductMeta: ComponentMeta<SwellProductProps> = {
  name: "swell-product",
  displayName: "Swell Product",
  importName: "SwellProduct",
  importPath: thisModule,
  props: {
    product: {
      type: "choice",
      displayName: "Product",
      description: "The product slug",
      options: (_props, shopInfo: ShopInfo | null) =>
      shopInfo?.products.map((p) => 
        ({
        value: p.slug,
        label: p.name,
      })
    ) ?? [],
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: "swell-product-title",
          },
          {
            type: "component",
            name: "swell-product-image",
            styles: {
              width: "auto",
              height: "auto",
              maxWidth: "100%",
            },
          },
          {
            type: "component",
            name: "swell-product-price",
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

export function registerSwellProduct(
  loader?: { registerComponent: typeof registerComponent },
  customSwellProductMeta?: ComponentMeta<SwellProductProps>
) {
  if (loader) {
    loader.registerComponent(
      SwellProduct,
      customSwellProductMeta ?? swellProductMeta
    );
  } else {
    registerComponent(
      SwellProduct,
      customSwellProductMeta ?? swellProductMeta
    );
  }
}

export const productTitleMeta: ComponentMeta<ProductTitleProps> = {
  name: "swell-product-title",
  importName: "ProductTitle",
  displayName: "Product Title",
  props: {},
  importPath: thisModule,
};

export function registerProductTitle(
  loader?: { registerComponent: typeof registerComponent },
  customProductTitleMeta?: ComponentMeta<ProductTitleProps>,
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
  name: "swell-product-price",
  importName: "ProductPrice",
  displayName: "Product Price",
  props: {},
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
  name: "swell-product-image",
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

export function registerAllSwellComponents(loader?: {
  registerComponent: typeof registerComponent;
}) {
  registerSwellCredentialsProvider(loader);
  registerSwellProduct(loader);
  registerProductCollection(loader);
  registerProductTitle(loader);
  registerProductPrice(loader);
  registerProductImage(loader);
}