import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { repeatedElement } from "@plasmicapp/host";
import { ProductProvider } from "./contexts";
import useSearch from "./product/use-search";
import { Product } from "./types/product";
import { useCategories, useBrands } from ".";
import { Brand, Category } from "./types/site";

interface ProductCollectionProps {
  className?: string;
  children?: React.ReactNode;
  count?: number;
  category?: string;
  brand?: string;
  setControlContextData?: (
    data: {
      categories: Category[],
      brands: Brand[],
    }
  ) => void;
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
                field: "name"
              }
            },
            {
              type: "component",
              name: "plasmic-commerce-product-media"
            }
          ],
          styles: {
            width: "100%",
            minWidth: 0,
          }
        },
      ]
    },
    count: "number",
    category: {
      type: "choice",
      options: (props, ctx) => {
        return ctx?.categories.map(category => ({
          label: category.name,
          value: category.id
        })) ?? [];
      }
    },
    brand: {
      type: "choice",
      options: (props, ctx) => {
        return ctx?.brands.map((brand: Brand) => ({
          label: brand.name,
          value: brand.entityId,
        })) ?? [];
      }
    },
  },
  defaultStyles: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gridRowGap: "8px",
    gridColumnGap: "8px",
    padding: "8px",
    maxWidth: "100%"
  },
  importPath: "commerce-providers/commerce",
  importName: "ProductCollection",
};

function ProductCollection(props: ProductCollectionProps) {
  const { 
    className, 
    children, 
    count, 
    category,
    brand,
    setControlContextData
  } = props;

  const { data } = useSearch({
    categoryId: category,
    brandId: brand,
    count
  });

  const { data: categories } = useCategories({})

  const { data: brands } = useBrands({})

  if (categories && brands) {
    setControlContextData?.({
      categories,
      brands,
    });
  }

  return (
    <div className={className}>
      {data?.products.map((product: Product, i: number) =>
        <ProductProvider product={product} key={product.id}>
          {repeatedElement(i === 0, children)}
        </ProductProvider>
      )}
    </div>
  )
}

export function registerProductCollection(
  loader?: Registerable,
  customProductCollectionMeta?: ComponentMeta<ProductCollectionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductCollection, customProductCollectionMeta ?? productCollectionMeta);
}
