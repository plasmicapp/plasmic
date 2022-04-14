import { useCommerce } from "../commerce";

export const useCommerceExtraFeatures = () => {
  const { providerRef } = useCommerce()
  return providerRef.current.extraFeatures;
}