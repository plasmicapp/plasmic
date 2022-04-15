import { Product } from "./types/product";
import React, { useContext } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { Category } from "./types/site";
import { defaultProduct } from "./utils/default-product";

export const ProductContext = React.createContext<Product | undefined>(undefined);
export const ProductFormContext = React.createContext<any>(undefined);
export const CategoryContext = React.createContext<Category | undefined>(undefined);

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

export const useProduct = () => {
  const product = useContext(ProductContext);
  return product ?? defaultProduct;
}

export const useProductForm = () => useContext(ProductFormContext);

export function CategoryProvider({
  category,
  children
}: {
  category: Category,
  children: React.ReactNode
}) {
  return (
    <CategoryContext.Provider value={category} key={category.id}>
      {children}
    </CategoryContext.Provider>
  )
}

export const useCategoryContext = () => useContext(CategoryContext);