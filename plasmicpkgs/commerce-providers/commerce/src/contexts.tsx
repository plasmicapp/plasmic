import { Product } from "./types/product";
import React, { useContext } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";

export const ProductContext = React.createContext<Product | undefined>(undefined);
export const ProductFormContext = React.createContext<any>(undefined);

export function ProductProvider({
  product,
  children
}: {
  product: Product,
  children: React.ReactNode
}) {
  const methods = useForm();
  return (
    <ProductContext.Provider value={product} key={product.id}>
      <FormProvider {...methods}>
        { children }
      </FormProvider>
    </ProductContext.Provider>
  )
}

export function useProduct() {
  return useContext(ProductContext);
}
export function useProductForm() {
  return useContext(ProductFormContext);
}
