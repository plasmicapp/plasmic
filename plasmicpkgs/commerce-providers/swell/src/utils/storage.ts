/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
export const getCheckoutIdFromStorage = (token: string) => {
  if (window && window.sessionStorage) {
    return window.sessionStorage.getItem(token)
  }

  return null
}

export const setCheckoutIdInStorage = (token: string, id: string | number) => {
  if (window && window.sessionStorage) {
    return window.sessionStorage.setItem(token, id + '')
  }
}
