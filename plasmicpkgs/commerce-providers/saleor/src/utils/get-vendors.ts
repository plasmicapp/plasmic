import { SaleorConfig } from '../api'
import { getAllProductVendors } from './queries'
import { GetAllProductPathsQuery, GetAllProductPathsQueryVariables } from '../schema';

export type Brand = {
  entityId: string
  name: string
  path: string
}

export type BrandEdge = {
  node: Brand
}

export type Brands = BrandEdge[]

// TODO: Find a way to get vendors from meta
const getVendors = async (config: SaleorConfig): Promise<BrandEdge[]> => {
  const { data } = await config.fetch<
    GetAllProductPathsQuery,
    GetAllProductPathsQueryVariables
  >(getAllProductVendors)

  let vendorsStrings = data.products.edges.map(({ node: { vendor } }) => vendor)

  return [...new Set(vendorsStrings)].map((v) => {
    const id = v.replace(/\s+/g, '-').toLowerCase()
    return {
      node: {
        entityId: id,
        name: v,
        path: `brands/${id}`,
      },
    }
  })

}

export default getVendors
