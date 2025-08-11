import { ENV } from "@/wab/client/env";
import { DefinePlugin } from "@rspack/core";

export const REQUIRED_VAR = Symbol();
export const OPTIONAL_VAR = Symbol();

/**
 * Converts real type to config type.
 *
 * Examples:
 *  `string` -> `string | typeof REQUIRED_VAR`
 *  `string | undefined` -> `string | typeof OPTIONAL_VAR`
 *  `string | null` -> `never` // for simplicity, null is not allowed
 */
type ValueConfig<T> = null extends T
  ? never
  : undefined extends T
  ? Exclude<T, undefined> | typeof OPTIONAL_VAR
  : T | typeof REQUIRED_VAR;
type EnvConfig = {
  [Key in keyof typeof ENV]: ValueConfig<(typeof ENV)[Key]>;
};

/**
 * Type-safe way to configure DefinePlugin that matches ENV type.
 *
 * Each KEY will be available as `process.env.KEY` in client code.
 * The value can be:
 * - `REQUIRED_VAR`: Uses the value from process.env at build-time, errors if not found
 * - `OPTIONAL_VAR`: Uses the value from process.env at build-time, never errors unless production
 * - Any other value: Uses the provided value directly
 */
export function mkDefinePluginOptsForEnv(
  envConfig: EnvConfig
): ConstructorParameters<typeof DefinePlugin>[0] {
  return Object.fromEntries(
    Object.entries(envConfig).map(([key, value]) => {
      const envKey = `process.env.${key}`;

      // In EnvironmentPlugin, undefined = required, null = optional
      const processEnvValue = process.env[key];
      if (value === REQUIRED_VAR) {
        if (!processEnvValue) {
          throw new Error(`process.env.${key} missing`);
        }
        return [envKey, JSON.stringify(processEnvValue)];
      } else if (value === OPTIONAL_VAR) {
        if (process.env.NODE_ENV === "production" && !processEnvValue) {
          throw new Error(`process.env.${key} missing in production build`);
        }
        return [
          envKey,
          processEnvValue ? JSON.stringify(processEnvValue) : undefined,
        ];
      } else {
        if (processEnvValue) {
          throw new Error(`process.env.${key} found`);
        }
        return [envKey, JSON.stringify(value)];
      }
    })
  );
}
