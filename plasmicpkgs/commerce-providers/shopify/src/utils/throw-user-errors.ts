/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import { ValidationError } from "@plasmicpkgs/commerce";

import {
  CheckoutErrorCode,
  CheckoutUserError,
  CustomerErrorCode,
  CustomerUserError,
} from "./graphql/gen/graphql";

export type UserErrors = Array<CheckoutUserError | CustomerUserError>;

export type UserErrorCode =
  | CustomerErrorCode
  | CheckoutErrorCode
  | null
  | undefined;

const getCustomMessage = (code: UserErrorCode, message: string) => {
  switch (code) {
    case "UNIDENTIFIED_CUSTOMER":
      message = "Cannot find an account that matches the provided credentials";
      break;
  }
  return message;
};

export const throwUserErrors = (errors?: UserErrors) => {
  if (errors && errors.length) {
    throw new ValidationError({
      errors: errors.map(({ code, message }) => ({
        code: code ?? "validation_error",
        message: getCustomMessage(code, message),
      })),
    });
  }
};
