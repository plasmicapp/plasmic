import { assert } from "@/wab/shared/common";

export const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export type HttpMethod = (typeof httpMethods)[number];

export const lowerHttpMethods = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
] as const;

export type LowerHttpMethod = (typeof lowerHttpMethods)[number];

export function methodCanHaveBody(method: HttpMethod) {
  return method !== "GET";
}

export function ensureHttpMethod(method: any): HttpMethod {
  assert(httpMethods.includes(method));
  return method;
}
