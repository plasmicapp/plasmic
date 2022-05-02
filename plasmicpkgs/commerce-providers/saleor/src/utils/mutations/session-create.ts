/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const SessionCreate = /* GraphQL */ `
  mutation SessionCreate($email: String!, $password: String!) {
    tokenCreate(email: $email, password: $password) {
      token
      refreshToken
      csrfToken
      errors {
        code
        field
        message
      }
    }
  }
`
