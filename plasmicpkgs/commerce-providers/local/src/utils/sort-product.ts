import data from "../data.json";

export const sortProduct = (
  a: typeof data.products[0],
  b: typeof data.products[0],
  sortKey: string
) => {
  switch (sortKey) {
    case "price-asc":
      return a.price.value < b.price.value ? -1 : 1;
    case "price-desc":
      return a.price.value < b.price.value ? 1 : -1;
    case "trending-desc":
      return a.id.localeCompare(b.id);
    case "latest-desc":
      return a.id.localeCompare(b.id) * -1;
    default:
      return 0;
  }
};
