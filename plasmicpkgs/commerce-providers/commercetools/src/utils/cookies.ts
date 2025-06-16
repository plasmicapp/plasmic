import Cookies, { CookieAttributes } from 'js-cookie';
import { COMMERCETOOLS_COOKIE_EXPIRE } from '../const'

const options: CookieAttributes = {
  expires: COMMERCETOOLS_COOKIE_EXPIRE,
  sameSite: process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_COOKIES !== 'true' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_COOKIES !== 'true',
}

export const getCookies = <T>(name: string) => {
  const cookie = Cookies.get(name);
  return cookie ? (JSON.parse(cookie) as T) : undefined
}

export const setCookies = (name: string, value: any) => Cookies.set(name, JSON.stringify(value), options);

export const removeCookies = (name: string) => Cookies.remove(name);
