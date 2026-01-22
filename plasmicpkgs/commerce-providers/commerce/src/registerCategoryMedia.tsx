import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useCategoryContext } from "./contexts";
import { Registerable } from "./registerable";

interface CategoryMediaProps {
  className: string;
  mediaIndex?: number;
}

export const categoryMediaMeta: CodeComponentMeta<CategoryMediaProps> = {
  name: "plasmic-commerce-category-media",
  displayName: "Category Media",
  props: {
    mediaIndex: "number",
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "CategoryMedia",
};

export const CategoryMedia = React.forwardRef(
  (props: CategoryMediaProps, ref: React.ForwardedRef<HTMLImageElement>) => {
    const { className, mediaIndex = 0 } = props;

    const category = useCategoryContext();

    const image = category?.images ? category.images[mediaIndex] : undefined;
    return (
      <img
        ref={ref}
        alt={category?.name || "Category Image"}
        src={image?.url ?? ""}
        loading={"lazy"}
        className={className}
      />
    );
  }
);

export function registerCategoryMedia(
  loader?: Registerable,
  customCategoryMediaMeta?: CodeComponentMeta<CategoryMediaProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    CategoryMedia,
    customCategoryMediaMeta ?? categoryMediaMeta
  );
}
