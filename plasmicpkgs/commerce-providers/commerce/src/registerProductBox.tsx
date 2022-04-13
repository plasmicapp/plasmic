import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { ProductProvider } from "./contexts";
import useProduct from "./product/use-product";
import { CommerceError } from "./utils/errors";

interface ProductBoxProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  noLayout?: boolean;
}

export const productBoxMeta: ComponentMeta<ProductBoxProps> = {
  name: "plasmic-commerce-product-box",
  displayName: "Product Box",
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
    noLayout: "boolean",
    id: {
      type: "string",
      description: "Fetch a product by its slug or ID"
    }
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductBox",
};

export function ProductBox(props: ProductBoxProps) {
  const {
    className,
    children,
    noLayout,
    id,
  } = props;

  const { data, error, isLoading } = useProduct({
    id
  });

  if (!id) {
    return <span>You must set the id prop</span>
  }

  if (error) {
    throw new CommerceError({
      message: error.message,
      code: error.code
    });
  }

  if (isLoading) {
    return <span>Loading...</span>
  }

  if (!data) {
    throw new Error("Product not found!");
  }

  const renderedData = (
    <ProductProvider product={data}>
      {children}
    </ProductProvider>
  );

  return noLayout
    ? <React.Fragment>{renderedData}</React.Fragment>
    : <div className={className}>{renderedData}</div>
}

export function registerProductBox(
  loader?: Registerable,
  customProductBoxMeta?: ComponentMeta<ProductBoxProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductBox, customProductBoxMeta ?? productBoxMeta);
}
