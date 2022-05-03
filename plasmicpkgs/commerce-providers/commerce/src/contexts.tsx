import React, { useContext } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Product } from "./types/product";
import { Category } from "./types/site";
import { defaultProduct } from "./utils/default-product";

export const ProductContext = React.createContext<Product | undefined>(
  undefined
);
export const ProductFormContext = React.createContext<any>(undefined);

export function ProductProvider({
  product,
  children,
}: {
  product: Product;
  children: React.ReactNode;
}) {
  const methods = useForm();
  return (
    <ProductContext.Provider value={product} key={product.id}>
      <FormProvider {...methods}>{children}</FormProvider>
    </ProductContext.Provider>
  );
}

export const useProduct = () => {
  const product = useContext(ProductContext);
  return product ?? defaultProduct;
};

export const useProductForm = () => useContext(ProductFormContext);

export const CategoryContext = React.createContext<Category | undefined>(
  undefined
);
export const PrimaryCategoryContext = React.createContext<Category | undefined>(
  undefined
); //used to render correctly the defaultValueHint in ProductCollection

export function CategoryProvider({
  category,
  children,
}: {
  category: Category;
  children: React.ReactNode;
}) {
  return (
    <CategoryContext.Provider value={category} key={category.id}>
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategoryContext = () => useContext(CategoryContext);
export const usePrimaryCategory = () => useContext(PrimaryCategoryContext);

export const ProductMediaContext = React.createContext<number | undefined>(
  undefined
);
export function ProductMediaProvider({
  mediaIndex,
  onClick,
  children,
}: {
  mediaIndex: number;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <ProductMediaContext.Provider value={mediaIndex} key={mediaIndex}>
      {React.cloneElement(React.isValidElement(children) ? children : <></>, {
        onClick,
      })}
    </ProductMediaContext.Provider>
  );
}
export const useProductMediaContext = () => useContext(ProductMediaContext);
