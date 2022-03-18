/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import { Fetcher } from '@plasmicpkgs/commerce'
import { CommerceError } from '@plasmicpkgs/commerce'
import { handleFetchResponse } from './utils'
import swell from './provider'

const fetcher: Fetcher = async ({ method = 'get', variables, query }) => {
  async function callSwell() {
    if (Array.isArray(variables)) {
      const arg1 = variables[0]
      const arg2 = variables[1]
      const response = await swell[query!][method](arg1, arg2)
      return handleFetchResponse(response)
    } else {
      const response = await swell[query!][method](variables)
      return handleFetchResponse(response)
    }
  }

  if (query && query in swell) {
    return await callSwell()
  } else {
    throw new CommerceError({ message: 'Invalid query argument!' })
  }
}

export default fetcher
