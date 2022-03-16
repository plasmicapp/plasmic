import { Fetcher } from '@plasmicpkgs/commerce';

export const fetcher: Fetcher = async () => {
  console.log('FETCHER')
  const res = await fetch('./data.json')
  if (res.ok) {
    const { data } = await res.json()
    return data
  }
  throw res
}
