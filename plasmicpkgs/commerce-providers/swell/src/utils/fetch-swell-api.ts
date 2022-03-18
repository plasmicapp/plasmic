/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import swell from '../provider'

const fetchApi = async (query: string, method: string, variables: [] = []) => {
  return swell[query][method](...variables)
}

export default fetchApi
