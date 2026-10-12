export const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export const lowerHttpMethods = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
] as const;

export type LowerHttpMethod = (typeof lowerHttpMethods)[number];
