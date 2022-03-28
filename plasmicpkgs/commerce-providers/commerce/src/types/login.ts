/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/commerce/src
  Changes: None
*/
export type LoginBody = {
  email: string
  password: string
}

export type LoginTypes = {
  body: LoginBody
}

export type LoginHook<T extends LoginTypes = LoginTypes> = {
  data: null
  actionInput: LoginBody
  fetcherInput: LoginBody
  body: T['body']
}

export type LoginSchema<T extends LoginTypes = LoginTypes> = {
  endpoint: {
    options: {}
    handlers: {
      login: LoginHook<T>
    }
  }
}

export type LoginOperation = {
  data: { result?: string }
  variables: unknown
}
