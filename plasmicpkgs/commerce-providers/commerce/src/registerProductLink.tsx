import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { useProduct } from "./contexts";

interface ProductLinkProps {
  className?: string;
  children?: React.ReactNode;
  linkDest?: string;
}

export const productLinkMeta: ComponentMeta<ProductLinkProps> = {
  name: "plasmic-commerce-product-link",
  displayName: "Product Link",
  props: {
    children: "slot",
    linkDest: {
      type: "string",
      defaultValueHint: "products/{slug}",
      description: "Set the link destination. You can use {slug} to replace by the product slug"
    }
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductLink",
};

export function ProductLink(props: ProductLinkProps) {
  const { className, children, linkDest } = props;

  const product = useProduct();

  const resolveLink = (linkDest: string | undefined) => {
    if (!product || !linkDest) {
      return undefined;
    }
    const regex = /{[^}]*}/;
    const regexAll = new RegExp(regex, "g");
    const matches = linkDest.match(regexAll) ?? [];
    let resolvedLink = linkDest;
    for (const match of matches) {
      const field = match.slice(1, -1);
      if (!(field in product)) {
        return undefined;
      }
      resolvedLink = resolvedLink.replace(regex, (product as any)[field]);
    }
    return resolvedLink;
  }

  return (
    <a 
      className={className}
      href={resolveLink(linkDest)}
      style={{
        color: "inherit",
        textDecoration: "inherit"
      }}>
      {children}
    </a>
  );
}

export function registerProductLink(
  loader?: Registerable,
  customProductLinkMeta?: ComponentMeta<ProductLinkProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductLink, customProductLinkMeta ?? productLinkMeta);
}
