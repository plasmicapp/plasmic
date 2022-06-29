import { SWRHook } from '@plasmicpkgs/commerce'
import { useProduct, UseProduct } from '@plasmicpkgs/commerce'
import {
  Product,
  ProductProjection,
  ClientResponse,
} from '@commercetools/platform-sdk'
import { normalizeProduct } from '../utils'
import type { GetProductHook } from '@plasmicpkgs/commerce'

export type GetProductInput = {
  id?: string
}

export default useProduct as UseProduct<typeof handler>

export const handler: SWRHook<GetProductHook> = {
  fetchOptions: {
    query: "productProjections",
    method: "get"
  },
  async fetcher({ input, options, fetch, provider }) {
    const { id } = input
    if (!id) {
      return null
    }

    const product = await fetch<ClientResponse<ProductProjection>>({
      ...options,
      variables: {
        id
      },
    });
    return product.body 
      ? normalizeProduct(product.body, provider!.locale)
      : null
  },
  useHook:
    ({ useData }) =>
    (input = {}) => {
      return useData({
        input: [
          ['id', input.id],
        ],
        swrOptions: {
          revalidateOnFocus: false,
          ...input.swrOptions,
        },
      })
    },
}
