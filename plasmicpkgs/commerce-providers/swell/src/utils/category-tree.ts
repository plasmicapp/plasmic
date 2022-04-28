import { Category } from "../types/site";
import { ensure } from "./common";

export const walkCategoryTree = (
  category?: Category,
  categories?: Category[]
) => {
  if (!category || !categories) {
    return [];
  }

  const queue: Category[] = [category];
  const result: Category[] = [];
  while (queue.length > 0) {
    const curr = ensure(queue.shift());
    result.push(curr);
    queue.push(
      ...(curr.children?.map((child) =>
        ensure(
          categories.find((category) => category.id === child),
          "The child category must always exist in the categories list"
        )
      ) ?? [])
    );
  }
  return result;
};

export const topologicalSortForCategoryTree = (categories: Category[]) => {
  return categories
    .filter((category) => !category.parentId)
    .flatMap((category) => walkCategoryTree(category, categories));
};
