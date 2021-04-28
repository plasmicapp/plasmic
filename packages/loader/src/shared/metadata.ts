import * as querystring from "querystring";

/**
 * This is meant to be called set metadata
 * into the PLASMIC_METADATA environment variable
 * @param metadata
 */
export function setMetadata(metadata: Record<string, string>): void {
  const fromEnv = process.env.PLASMIC_METADATA
    ? querystring.decode(process.env.PLASMIC_METADATA)
    : {};
  const env = { ...fromEnv };

  for (const [k, v] of Object.entries(metadata)) {
    if (!env[k]) {
      env[k] = v;
    }
  }
  process.env.PLASMIC_METADATA = querystring.encode(env);
}
