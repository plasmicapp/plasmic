/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const AccountCreate = /* GraphQL */ `
  mutation AccountCreate($input: AccountRegisterInput!) {
    accountRegister(input: $input) {
      errors {
        code
        field
        message
      }
      user {
        email
        isActive
      }
    }
  }
`
