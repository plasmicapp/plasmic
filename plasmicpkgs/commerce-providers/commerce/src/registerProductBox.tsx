import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import debounce from "debounce";
import React from "react";
import { ProductProvider } from "./contexts";
import useProduct from "./product/use-product";
import useSearch from "./product/use-search";
import { Registerable } from "./registerable";
import { Product } from "./types/product";
import { CommerceError } from "./utils/errors";

interface ProductBoxProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  noLayout?: boolean;
  setControlContextData?: (data: {
    products: Product[];
    onSearch?: (value: string) => void;
  }) => void;
}

export const productBoxMeta: CodeComponentMeta<ProductBoxProps> = {
  name: "plasmic-commerce-product-box",
  displayName: "Product Box",
  description:
    "Show a single product. [See commerce tutorial video](https://www.youtube.com/watch?v=1OJ_gXmta2Q)",
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
    noLayout: "boolean",
    id: {
      type: "cardPicker",
      modalTitle: "Product",
      onSearch: (props, ctx) => ctx?.onSearch,
      showInput: true,
      options: (props, ctx) =>
        ctx?.products.map((product) => ({
          imgUrl: product.images?.[0]?.url,
          value: product.id,
          label: product.slug ?? product.name,
          footer: (
            <div>
              <div>
                <strong>{product.name}</strong>
              </div>
              <div>{product.slug}</div>
            </div>
          ),
        })) ?? [],
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductBox",
  providesData: true,
};

export function ProductBox(props: ProductBoxProps) {
  const { className, children, noLayout, id, setControlContextData } = props;

  const [productSearch, setProductSearch] = React.useState("");

  const { data: allProducts } = useSearch({
    search: productSearch !== "" ? productSearch : undefined,
  });
  const onSearch = React.useCallback(
    debounce((value: string) => setProductSearch(value), 300),
    []
  );
  if (allProducts) {
    setControlContextData?.({
      products: allProducts.products,
      onSearch,
    });
  }

  const { data, error, isLoading } = useProduct({
    id,
  });

  if (!id) {
    return <span>You must set the id prop</span>;
  }

  if (error) {
    throw new CommerceError({
      message: error.message,
      code: error.code,
    });
  }

  if (isLoading) {
    return <span>Loading...</span>;
  }

  if (!data) {
    throw new Error("Product not found!");
  }

  const renderedData = (
    <ProductProvider product={data}>{children}</ProductProvider>
  );

  return noLayout ? (
    <React.Fragment>{renderedData}</React.Fragment>
  ) : (
    <div className={className}>{renderedData}</div>
  );
}

export function registerProductBox(
  loader?: Registerable,
  customProductBoxMeta?: CodeComponentMeta<ProductBoxProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductBox, customProductBoxMeta ?? productBoxMeta);
}
