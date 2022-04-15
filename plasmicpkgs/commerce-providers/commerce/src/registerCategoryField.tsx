import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useCategoryContext } from "./contexts";
import { Registerable } from "./registerable";

interface CategoryFieldProps {
  className?: string;
  field?: string;
}
export const categoryFieldMeta: ComponentMeta<CategoryFieldProps> = {
  name: "plasmic-commerce-category-field",
  displayName: "Category Field",
  props: {
    field: {
      type: "choice",
      options: ["id", "name", "slug", "path"],
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "CategoryField",
};

export function CategoryField(props: CategoryFieldProps) {
  const { className, field } = props;

  const category = useCategoryContext();

  if (!field) {
    return <span>You must set the field prop</span>;
  }

  let data = category ? (category as any)[field] : "Category field placeholder";

  return <span className={className}>{data}</span>;
}

export function registerCategoryField(
  loader?: Registerable,
  customCategoryFieldMeta?: ComponentMeta<CategoryFieldProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    CategoryField,
    customCategoryFieldMeta ?? categoryFieldMeta
  );
}
