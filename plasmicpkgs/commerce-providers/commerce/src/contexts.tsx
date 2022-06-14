import { DataProvider, useSelector } from "@plasmicapp/host";
import React, { useContext } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Product } from "./types/product";
import { Category } from "./types/site";
import { defaultProduct } from "./utils/default-product";

const productSelector = "product";

export function ProductProvider({
  product,
  children,
}: {
  product: Product;
  children: React.ReactNode;
}) {
  const methods = useForm();
  return (
    <DataProvider name={productSelector} data={product} key={product.id}>
      <FormProvider {...methods}>{children}</FormProvider>
    </DataProvider>
  );
}

export const useProduct = () => {
  const product = useSelector(productSelector) as Product | undefined;
  return product ?? defaultProduct;
};

export const PrimaryCategoryContext = React.createContext<Category | undefined>(
  undefined
); //used to render correctly the defaultValueHint in ProductCollection

const categorySelector = "category";

export function CategoryProvider({
  category,
  children,
}: {
  category: Category;
  children: React.ReactNode;
}) {
  return (
    <DataProvider name={categorySelector} data={category} key={category.id}>
      {children}
    </DataProvider>
  );
}

export const useCategoryContext = () =>
  useSelector(categorySelector) as Category | undefined;
export const usePrimaryCategory = () => useContext(PrimaryCategoryContext);

const mediaSelector = "currentMedia";
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
    <DataProvider name={mediaSelector} data={mediaIndex} key={mediaIndex}>
      {React.cloneElement(React.isValidElement(children) ? children : <></>, {
        onClick,
      })}
    </DataProvider>
  );
}
export const useProductMediaContext = () =>
  useSelector(mediaSelector) as number | undefined;
