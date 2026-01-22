import {
  DataProvider,
  PlasmicCanvasContext,
  repeatedElement,
} from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { CategoryProvider, PrimaryCategoryContext } from "./contexts";
import { Registerable } from "./registerable";
import useCategories from "./site/use-categories";
import { Category } from "./types/site";

interface CategoryCollectionProps {
  className?: string;
  children?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  loadingMessage?: React.ReactNode;
  noLayout?: boolean;
  noAutoRepeat?: boolean;
  category?: string;
  setControlContextData?: (data: { categories: Category[] }) => void;
}

export const categoryCollectionMeta: CodeComponentMeta<CategoryCollectionProps> =
  {
    name: "plasmic-commerce-category-collection",
    displayName: "Category Collection",
    props: {
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "vbox",
            children: [
              {
                type: "component",
                name: "plasmic-commerce-category-field",
                props: {
                  field: "name",
                },
              },
              {
                type: "component",
                name: "plasmic-commerce-product-collection",
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
          value: "No collection found!",
        },
      },
      loadingMessage: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Loading...",
        },
      },
      category: {
        type: "choice",
        options: (props, ctx) => {
          return (
            ctx?.categories.map((category) => ({
              label: `${"  ".repeat(category.depth ?? 0)}${category.name}`,
              value: category.id,
            })) ?? []
          );
        },
      },
      noLayout: {
        type: "boolean",
        displayName: "No layout",
        description: "Do not render a container element.",
      },
      noAutoRepeat: {
        type: "boolean",
        displayName: "No auto-repeat",
        description: "Do not automatically repeat children for every category.",
      },
    },
    defaultStyles: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gridRowGap: "8px",
      padding: "8px",
      maxWidth: "100%",
    },
    importPath: "@plasmicpkgs/commerce",
    importName: "CategoryCollection",
    providesData: true,
  };

export function CategoryCollection(props: CategoryCollectionProps) {
  const {
    children,
    noLayout,
    noAutoRepeat,
    className,
    loadingMessage,
    emptyMessage,
    category: selectedCategory,
    setControlContextData,
  } = props;

  const inEditor = React.useContext(PlasmicCanvasContext);

  const { data: allCategories, isLoading: isAllCategoriesLoading } =
    useCategories();

  const { data: categories, isLoading } = useCategories({
    categoryId: selectedCategory,
    addIsEmptyField: !!inEditor,
  });

  if (allCategories) {
    setControlContextData?.({
      categories: allCategories,
    });
  }

  const firstCategoryNotEmpty = categories?.find(
    (category) => !category.isEmpty
  );
  const firstCategoryNotEmptyIndex =
    categories?.findIndex((category) => !category.isEmpty) ?? -1;

  const renderedData = noAutoRepeat
    ? children
    : categories?.map((category, i) => (
        <CategoryProvider category={category} key={category.id}>
          {repeatedElement(
            i < firstCategoryNotEmptyIndex
              ? i + 1
              : i === firstCategoryNotEmptyIndex
              ? 0
              : i,
            children
          )}
        </CategoryProvider>
      ));

  if ([isAllCategoriesLoading, isLoading].includes(true)) {
    return React.isValidElement(loadingMessage) ? loadingMessage : null;
  }

  if (!categories || categories.length === 0) {
    return React.isValidElement(emptyMessage) ? emptyMessage : null;
  }

  return (
    <DataProvider name="categories" data={categories}>
      <PrimaryCategoryContext.Provider
        value={firstCategoryNotEmpty ?? categories[0]}
      >
        {noLayout ? (
          <React.Fragment>{renderedData}</React.Fragment>
        ) : (
          <div className={className}>{renderedData}</div>
        )}
      </PrimaryCategoryContext.Provider>
    </DataProvider>
  );
}

export function registerCategoryCollection(
  loader?: Registerable,
  customCategoryCollectionMeta?: CodeComponentMeta<CategoryCollectionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    CategoryCollection,
    customCategoryCollectionMeta ?? categoryCollectionMeta
  );
}
