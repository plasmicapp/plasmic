import { initContract } from "@ts-rest/core";

const c = initContract();

/**
 *
 * Should match the error structure of BadRequestError in createTsRestEndpoints.
 */
export function cStandard400Response() {
  return c.type<{
    error: { statusCode: number; message: string; issues?: unknown };
  }>();
}

/**
 *
 * Should match the error structure of BadRequestError in createTsRestEndpoints.
 */
export function cStandard4xxResponse() {
  return c.type<{
    error: { statusCode: number; message: string };
  }>();
}
