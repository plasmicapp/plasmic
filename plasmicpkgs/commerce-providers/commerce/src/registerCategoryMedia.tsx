import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useCategoryContext } from "./contexts";
import { Registerable } from "./registerable";

interface CategoryMediaProps {
  className: string;
  mediaIndex?: number;
  mediaSize?: string;
}

export const categoryMediaMeta: ComponentMeta<CategoryMediaProps> = {
  name: "plasmic-commerce-category-media",
  displayName: "Category Media",
  props: {
    mediaIndex: "number",
    mediaSize: {
      type: "choice",
      options: [
        { label: "Fill", value: "fill" },
        { label: "Container", value: "contain" },
        { label: "Cover", value: "cover" },
        { label: "None", value: "none" },
        { label: "Scale down", value: "scale-down" },
      ],
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "CategoryMedia",
};

export function CategoryMedia(props: CategoryMediaProps) {
  const { className, mediaIndex = 0, mediaSize } = props;

  const category = useCategoryContext();

  const image = category?.images ? category.images[mediaIndex] : undefined;
  return (
    <img
      alt={category?.name || "Category Image"}
      src={image?.url ?? ""}
      loading={"lazy"}
      className={className}
      style={{
        objectFit: mediaSize as any,
      }}
    />
  );
}

export function registerCategoryMedia(
  loader?: Registerable,
  customCategoryMediaMeta?: ComponentMeta<CategoryMediaProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    CategoryMedia,
    customCategoryMediaMeta ?? categoryMediaMeta
  );
}
