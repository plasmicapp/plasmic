/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import { ValidationError } from '@plasmicpkgs/commerce';
import { CheckoutError, CheckoutErrorCode, AppError, AccountError, AccountErrorCode } from '../schema'

export type UserErrors = Array<CheckoutError | AccountError | AppError>

export type UserErrorCode = CheckoutErrorCode | AccountErrorCode | null | undefined

export const throwUserErrors = (errors?: UserErrors) => {
  if (errors && errors.length) {
    throw new ValidationError({
      errors: errors.map(({ code, message }) => ({
        code: code ?? 'validation_error',
        message: message || '',
      })),
    })
  }
}

export default throwUserErrors
