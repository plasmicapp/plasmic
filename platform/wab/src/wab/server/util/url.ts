import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  RequestFilteringHttpAgent,
  RequestFilteringHttpsAgent,
} from "request-filtering-agent";

const ssrfAllowedIpAddresses: string[] = [];
const ssrfAgentOptions = { allowIPAddressList: ssrfAllowedIpAddresses };
const ssrfHttpAgent = new RequestFilteringHttpAgent(ssrfAgentOptions);
const ssrfHttpsAgent = new RequestFilteringHttpsAgent(ssrfAgentOptions);

/**
 * Axios request config minus options that {@link fetchUntrusted} controls and
 * call sites may not override:
 * - `httpAgent` / `httpsAgent` are the guard itself.
 * - `adapter` / `transport` / `proxy` could replace or bypass the transport
 *   layer the guard runs in, defeating it.
 */
export type UntrustedRequestConfig = Omit<
  AxiosRequestConfig,
  "httpAgent" | "httpsAgent" | "adapter" | "transport" | "proxy"
>;

/**
 * For safely calling untrusted URLs, while being protected from SSRF attacks.
 *
 * Defaults to always return AxiosResponse regardless of the status code.
 * Defaults to return raw string body by not transforming the response.
 */
export async function fetchUntrusted<T = string>(
  req: UntrustedRequestConfig
): Promise<AxiosResponse<T>> {
  // Default: return AxiosResponse since it's easier to handle than AxiosError
  const validateStatus = req.validateStatus ?? null;
  // Default: do not transform the response since we don't know the schema
  const transformResponse = req.transformResponse ?? ((data) => data);
  try {
    return await axios.request<T>({
      ...req,
      httpAgent: ssrfHttpAgent,
      httpsAgent: ssrfHttpsAgent,
      proxy: false,
      validateStatus,
      transformResponse,
    });
  } catch (err) {
    if (isRequestFilteringAgentError(err)) {
      throw new UnsafeUrlError(req.url ?? "");
    } else {
      throw err;
    }
  }
}

/**
 * All errors from request-filtering-agent have the following format:
 *  "DNS lookup <address> is not allowed. Because <reason>."
 */
function isRequestFilteringAgentError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message;
    return (
      message.includes("DNS lookup ") &&
      message.includes(" is not allowed. Because")
    );
  } else {
    return false;
  }
}

export class UnsafeUrlError extends Error {
  readonly name = "UnsafeUrlError";

  constructor(url: string) {
    super(`Unsafe URL: ${url}`);
  }
}

export const _testonly = {
  ssrfAllowedIpAddresses,
};
