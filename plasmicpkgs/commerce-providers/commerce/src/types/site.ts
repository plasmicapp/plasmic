/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/commerce/src
  Changes: None
*/
export type Category = {
  id: string
  name: string
  slug: string
  path: string
}

export type Brand = {
  name: string
  entityId: string
  path: string
}

export type SearchSiteInfoBody = {
  locale?: string
}

export type SiteTypes = {
  category: Category
  brand: Brand
  searchBody: SearchSiteInfoBody
}

export type GetSiteInfoOperation<T extends SiteTypes = SiteTypes> = {
  data: {
    categories: T['category'][]
    brands: T['brand'][]
  }
}

export type GetCategoriesHook<T extends SiteTypes = SiteTypes> = {
  data: T['category'][] | null
  input: { }
  fetcherInput: { }
  swrState: { isEmpty: boolean }
}

export type GetBrandsHook<T extends SiteTypes = SiteTypes> = {
  data: T['brand'][] | null
  input: { }
  fetcherInput: { }
  swrState: { isEmpty: boolean }
}