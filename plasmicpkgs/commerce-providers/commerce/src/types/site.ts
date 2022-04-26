/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/commerce/src
  Changes: Added CategoryImage
*/

export type CategoryImage = {
  url: string;
  alt?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  path: string;
  isEmpty?: boolean;
  images?: CategoryImage[];
};

export type Brand = {
  name: string;
  entityId: string;
  path: string;
};

export type SearchSiteInfoBody = {
  locale?: string;
};

export type SiteTypes = {
  category: Category;
  brand: Brand;
  searchBody: SearchSiteInfoBody;
  getCategoriesBody: GetCategoriesBody;
};

export type GetSiteInfoOperation<T extends SiteTypes = SiteTypes> = {
  data: {
    categories: T["category"][];
    brands: T["brand"][];
  };
};

export type GetCategoriesBody = {
  topologicalSort?: boolean;
  addIsEmptyField?: boolean;
  categoryId?: string;
};

export type GetCategoriesHook<T extends SiteTypes = SiteTypes> = {
  data: T["category"][];
  input: T["getCategoriesBody"];
  fetcherInput: T["getCategoriesBody"];
  swrState: { isEmpty: boolean };
};

export type GetBrandsHook<T extends SiteTypes = SiteTypes> = {
  data: T["brand"][] | null;
  input: {};
  fetcherInput: {};
  swrState: { isEmpty: boolean };
};
