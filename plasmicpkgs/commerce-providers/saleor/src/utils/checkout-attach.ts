/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import { CheckoutCustomerAttach } from "../schema";
import * as mutation from "./mutations";

export const checkoutAttach = async (
  fetch: any,
  { variables, headers }: any,
): Promise<CheckoutCustomerAttach> => {
  const data = await fetch({
    query: mutation.CheckoutAttach,
    variables,
    headers,
  });

  return data;
};
