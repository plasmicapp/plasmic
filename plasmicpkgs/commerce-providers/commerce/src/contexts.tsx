import {
  DataProvider,
  GlobalActionDict,
  GlobalActionsProvider,
  useSelector,
} from "@plasmicapp/host";
import { GlobalActionRegistration } from "@plasmicapp/host/registerGlobalContext";
import React, { useContext } from "react";
import { FormProvider, useForm } from "react-hook-form";
import useAddItem from "./cart/use-add-item";
import useRemoveItem from "./cart/use-remove-item";
import useUpdateItem from "./cart/use-update-item";
import { Product } from "./types/product";
import { Category } from "./types/site";
import { defaultProduct } from "./utils/default-product";

const productSelector = "currentProduct";

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

const categorySelector = "currentCategory";

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

interface CartActions extends GlobalActionDict {
  addItem: (productId: string, variantId: string, quantity: number) => void;
  updateItem: (lineItemId: string, quantity: number) => void;
  removeItem: (lineItemId: string) => void;
}

export function CartActionsProvider(
  props: React.PropsWithChildren<{
    globalContextName: string;
  }>
) {
  const addItem = useAddItem();
  const removeItem = useRemoveItem();
  const updateItem = useUpdateItem();

  const actions: CartActions = React.useMemo(
    () => ({
      addItem(productId, variantId, quantity) {
        addItem({ productId, variantId, quantity });
      },
      updateItem(lineItemId, quantity) {
        updateItem({ id: lineItemId, quantity });
      },
      removeItem(lineItemId) {
        removeItem({ id: lineItemId });
      },
    }),
    [addItem, removeItem, updateItem]
  );

  return (
    <GlobalActionsProvider
      contextName={props.globalContextName}
      actions={actions}
    >
      {props.children}
    </GlobalActionsProvider>
  );
}

export const globalActionsRegistrations: Record<
  string,
  GlobalActionRegistration<any>
> = {
  addItem: {
    displayName: "Add item to cart",
    parameters: [
      {
        name: "productId",
        displayName: "Product Id",
        type: "string",
      },
      {
        name: "variantId",
        displayName: "Variant Id",
        type: "string",
      },
      {
        name: "quantity",
        displayName: "Quantity",
        type: "number",
      },
    ],
  },
  updateItem: {
    displayName: "Update item in cart",
    parameters: [
      {
        name: "lineItemId",
        displayName: "Line Item Id",
        type: "string",
      },
      {
        name: "quantity",
        displayName: "New Quantity",
        type: "number",
      },
    ],
  },
  removeItem: {
    displayName: "Remove item from cart",
    parameters: [
      {
        name: "lineItemId",
        displayName: "Line Item Id",
        type: "string",
      },
    ],
  },
};
