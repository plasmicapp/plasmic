import { SwellCategory } from "../types/site";
import { ensure } from "./common";

export const walkCategoryTree = (category?: SwellCategory, categories?: SwellCategory[]) => {
  if (!category || !categories) {
    return [];
  }

  const queue: SwellCategory[] = [category];
  const result: SwellCategory[] = [];
  while (queue.length > 0) {
    const curr = ensure(queue.shift());
    result.push(curr);
    queue.push(...(curr.children?.map(
      (child) => ensure(categories.find(category => category.id === child.id))
    ) ?? []));
  }
  return result;
}