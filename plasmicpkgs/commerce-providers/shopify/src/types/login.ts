/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import * as Core from '@vercel/commerce/types/login'
import type { CustomerAccessTokenCreateInput } from '../../schema'

export * from '@vercel/commerce/types/login'

export type LoginOperation = Core.LoginOperation & {
  variables: CustomerAccessTokenCreateInput
}
