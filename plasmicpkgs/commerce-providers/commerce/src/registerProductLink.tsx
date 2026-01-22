import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useProduct } from "./contexts";
import { Registerable } from "./registerable";

interface ProductLinkProps {
  className?: string;
  children?: React.ReactNode;
  linkDest?: string;
}

export const productLinkMeta: CodeComponentMeta<ProductLinkProps> = {
  name: "plasmic-commerce-product-link",
  displayName: "Product Link",
  props: {
    children: "slot",
    linkDest: {
      type: "string",
      defaultValueHint: "products/{slug}",
      description:
        "Set the link destination. You can use {slug} to replace by the product slug",
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductLink",
};

export function ProductLink(props: ProductLinkProps) {
  const { className, children, linkDest } = props;

  const product = useProduct();

  const resolveLink = (link: string | undefined) => {
    if (!link) {
      return undefined;
    }
    const regex = /{[^}]*}/;
    const regexAll = new RegExp(regex, "g");
    const matches = link.match(regexAll) ?? [];
    let resolvedLink = link;
    for (const match of matches) {
      const field = match.slice(1, -1);
      if (!product || !(field in product)) {
        return undefined;
      }
      resolvedLink = resolvedLink.replace(regex, (product as any)[field]);
    }
    return resolvedLink;
  };

  return (
    <a
      className={className}
      href={resolveLink(linkDest)}
      style={{
        color: "inherit",
        textDecoration: "inherit",
      }}
    >
      {children}
    </a>
  );
}

export function registerProductLink(
  loader?: Registerable,
  customProductLinkMeta?: CodeComponentMeta<ProductLinkProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductLink, customProductLinkMeta ?? productLinkMeta);
}
