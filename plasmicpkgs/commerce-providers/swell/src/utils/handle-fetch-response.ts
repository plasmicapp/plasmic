/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import { CommerceError } from '@plasmicpkgs/commerce'

type SwellFetchResponse = {
  error: {
    message: string
    code?: string
  }
}

const handleFetchResponse = async (res: SwellFetchResponse) => {
  if (res) {
    if (res.error) {
      throw new CommerceError(res.error)
    }
    return res
  }
  return null;
}

export default handleFetchResponse
