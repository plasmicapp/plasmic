/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import { FetcherOptions } from '@vercel/commerce/utils/types'
import throwUserErrors from './throw-user-errors'

import {
  MutationCustomerActivateArgs,
  MutationCustomerActivateByUrlArgs,
} from '../../schema'
import { Mutation } from '../../schema'
import { customerActivateByUrlMutation } from './mutations'

const handleAccountActivation = async (
  fetch: <T = any, B = Body>(options: FetcherOptions<B>) => Promise<T>,
  input: MutationCustomerActivateByUrlArgs
) => {
  try {
    const { customerActivateByUrl } = await fetch<
      Mutation,
      MutationCustomerActivateArgs
    >({
      query: customerActivateByUrlMutation,
      variables: {
        input,
      },
    })

    throwUserErrors(customerActivateByUrl?.customerUserErrors)
  } catch (error) {}
}

export default handleAccountActivation
