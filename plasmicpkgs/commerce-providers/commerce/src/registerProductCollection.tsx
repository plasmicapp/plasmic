import { repeatedElement } from "@plasmicapp/host";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { ProductProvider, useCategoryContext } from "./contexts";
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
  category?: string;
  includeSubCategories?: boolean;
  brand?: string;
  noLayout?: boolean;
  search?: string;
  sort?: string;
  setControlContextData?: (data: {
    categories: Category[];
    brands: Brand[];
    features?: CommerceExtraFeatures;
    hasCategoryCtx?: boolean;
  }) => void;
}

export const productCollectionMeta: ComponentMeta<ProductCollectionProps> = {
  name: "plasmic-commerce-product-collection",
  displayName: "Product Collection",
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
            label: category.name,
            value: category.id,
          })) ?? []
        );
      },
      hidden: (props, ctx) => !!ctx?.hasCategoryCtx,
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
    noLayout: "boolean",
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

  if (categories && brands) {
    setControlContextData?.({
      categories,
      brands,
      features,
      hasCategoryCtx: !!categoryCtx,
    });
  }

  const renderedData = data?.products.map((product: Product, i: number) => (
    <ProductProvider product={product} key={product.id}>
      {repeatedElement(i === 0, children)}
    </ProductProvider>
  ));

  if ([isSearchLoading, isBrandsLoading, isCategoriesLoading].includes(true)) {
    return React.isValidElement(loadingMessage) ? loadingMessage : null;
  }

  if (!data || data.products.length === 0) {
    return React.isValidElement(emptyMessage) ? emptyMessage : null;
  }

  return noLayout ? (
    <React.Fragment>{renderedData}</React.Fragment>
  ) : (
    <div className={className}>{renderedData}</div>
  );
}

export function registerProductCollection(
  loader?: Registerable,
  customProductCollectionMeta?: ComponentMeta<ProductCollectionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    ProductCollection,
    customProductCollectionMeta ?? productCollectionMeta
  );
}
