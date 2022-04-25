import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useCategoryContext } from "./contexts";
import { Registerable } from "./registerable";

interface CategoryLinkProps {
  className?: string;
  children?: React.ReactNode;
  linkDest?: string;
}

export const categoryLinkMeta: ComponentMeta<CategoryLinkProps> = {
  name: "plasmic-commerce-category-link",
  displayName: "Category Link",
  props: {
    children: "slot",
    linkDest: {
      type: "string",
      defaultValueHint: "category/{slug}",
      description:
        "Set the link destination. You can use {slug} to replace by the category slug",
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "CategoryLink",
};

export function CategoryLink(props: CategoryLinkProps) {
  const { className, children, linkDest } = props;

  const category = useCategoryContext();

  const resolveLink = (linkDest: string | undefined) => {
    if (!linkDest) {
      return undefined;
    }
    const regex = /{[^}]*}/;
    const regexAll = new RegExp(regex, "g");
    const matches = linkDest.match(regexAll) ?? [];
    let resolvedLink = linkDest;
    for (const match of matches) {
      const field = match.slice(1, -1);
      if (!category || !(field in category)) {
        return undefined;
      }
      resolvedLink = resolvedLink.replace(regex, (category as any)[field]);
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

export function registerCategoryLink(
  loader?: Registerable,
  customCategoryLinkMeta?: ComponentMeta<CategoryLinkProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(CategoryLink, customCategoryLinkMeta ?? categoryLinkMeta);
}
