import { DataProvider, repeatedElement } from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import {
  ProductProvider,
  useCategoryContext,
  usePrimaryCategory,
} from "./contexts";
import useSearch from "./product/use-search";
import { Registerable } from "./registerable";
import useBrands from "./site/use-brands";
import useCategories from "./site/use-categories";
import { Product } from "./types/product";
import { Brand, Category } from "./types/site";
import { CommerceExtraFeatures } from "./utils/types";
import { useCommerceExtraFeatures } from "./utils/use-extra-features";

interface ProductCollectionProps {
  className?: string;
  children?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  loadingMessage?: React.ReactNode;
  count?: number;
  category: string;
  includeSubCategories?: boolean;
  brand?: string;
  noLayout?: boolean;
  noAutoRepeat?: boolean;
  search?: string;
  sort?: string;
  setControlContextData?: (data: {
    categories: Category[];
    brands: Brand[];
    features?: CommerceExtraFeatures;
    categoryCtx?: Category;
  }) => void;
}

export const productCollectionMeta: CodeComponentMeta<ProductCollectionProps> =
  {
    name: "plasmic-commerce-product-collection",
    displayName: "Product Collection",
    description:
      "Show a product category. [See commerce tutorial video](https://www.youtube.com/watch?v=1OJ_gXmta2Q)",
    props: {
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "vbox",
            children: [
              {
                type: "component",
                name: "plasmic-commerce-product-text-field",
                props: {
                  field: "name",
                },
              },
              {
                type: "component",
                name: "plasmic-commerce-product-media",
              },
            ],
            styles: {
              width: "100%",
              minWidth: 0,
            },
          },
        ],
      },
      emptyMessage: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "No product found!",
        },
      },
      loadingMessage: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Loading...",
        },
      },
      count: "number",
      category: {
        type: "choice",
        options: (props, ctx) => {
          return (
            ctx?.categories.map((category) => ({
              label: `${"  ".repeat(category.depth ?? 0)}${category.name}`,
              value: category.id,
            })) ?? []
          );
        },
        defaultValueHint: (props, ctx) => ctx?.categoryCtx?.name,
        readOnly: (props, ctx) => !!ctx?.categoryCtx,
      },
      includeSubCategories: {
        type: "boolean",
        hidden: (props, ctx) => !ctx?.features?.includeSubCategories,
      },
      brand: {
        type: "choice",
        options: (props, ctx) => {
          return (
            ctx?.brands.map((brand: Brand) => ({
              label: brand.name,
              value: brand.entityId,
            })) ?? []
          );
        },
      },
      search: {
        type: "string",
      },
      sort: {
        type: "choice",
        options: [
          {
            label: "Trending",
            value: "trending-desc",
          },
          {
            label: "New Arrivals",
            value: "latest-desc",
          },
          {
            label: "Price: Low to High",
            value: "price-asc",
          },
          {
            label: "Price: High to Low",
            value: "price-desc",
          },
        ],
      },
      noLayout: {
        type: "boolean",
        displayName: "No layout",
        description: "Do not render a container element.",
      },
      noAutoRepeat: {
        type: "boolean",
        displayName: "No auto-repeat",
        description: "Do not automatically repeat children for every category.",
      },
    },
    defaultStyles: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gridRowGap: "8px",
      gridColumnGap: "8px",
      padding: "8px",
      maxWidth: "100%",
    },
    importPath: "@plasmicpkgs/commerce",
    importName: "ProductCollection",
    providesData: true,
  };

export function ProductCollection(props: ProductCollectionProps) {
  const {
    className,
    children,
    count,
    category,
    includeSubCategories,
    brand,
    noLayout,
    noAutoRepeat,
    setControlContextData,
    emptyMessage,
    loadingMessage,
    search,
    sort,
  } = props;

  const { data: categories, isLoading: isCategoriesLoading } = useCategories();

  const { data: brands, isLoading: isBrandsLoading } = useBrands();

  const categoryCtx = useCategoryContext();

  const { data, isLoading: isSearchLoading } = useSearch({
    categoryId: categoryCtx?.id ?? category,
    brandId: brand,
    count,
    categories: categories ?? [],
    includeSubCategories,
    search,
    sort,
  });

  const features = useCommerceExtraFeatures();
  const primaryCategory = usePrimaryCategory();
  if (categories && brands) {
    setControlContextData?.({
      categories,
      brands,
      features,
      categoryCtx: primaryCategory,
    });
  }

  const renderedData = noAutoRepeat
    ? children
    : data?.products.map((product: Product, i: number) => (
        <ProductProvider product={product} key={product.id}>
          {repeatedElement(i, children)}
        </ProductProvider>
      ));

  if ([isSearchLoading, isBrandsLoading, isCategoriesLoading].includes(true)) {
    return React.isValidElement(loadingMessage) ? loadingMessage : null;
  }

  if (!data || data.products.length === 0) {
    return React.isValidElement(emptyMessage) ? emptyMessage : null;
  }

  return (
    <DataProvider name="products" data={data?.products}>
      {noLayout ? (
        <React.Fragment>{renderedData}</React.Fragment>
      ) : (
        <div className={className}>{renderedData}</div>
      )}
    </DataProvider>
  );
}

export function registerProductCollection(
  loader?: Registerable,
  customProductCollectionMeta?: CodeComponentMeta<ProductCollectionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    ProductCollection,
    customProductCollectionMeta ?? productCollectionMeta
  );
}
