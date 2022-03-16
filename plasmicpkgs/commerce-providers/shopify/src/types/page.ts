/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import * as Core from '@vercel/commerce/types/page'
export * from '@vercel/commerce/types/page'

export type Page = Core.Page

export type PageTypes = {
  page: Page
}

export type GetAllPagesOperation = Core.GetAllPagesOperation<PageTypes>
export type GetPageOperation = Core.GetPageOperation<PageTypes>
