const isDefaultValue = (val: string | undefined) =>
  val === "PLEASE_RENDER_INSIDE_PROVIDER";
const seenDefaultVariants: Record<string, boolean> = {};

export type GlobalVariants = { [gv: string]: string | undefined };
export type UseGlobalVariants = () => GlobalVariants;

/**
 * Usage:
 * ```
 * // plasmic.ts
 * import { usePlatform } from "./PlasmicGlobalVariant__Platform";
 * import { useTheme } from "./PlasmicGlobalVariant__Theme";
 *
 * export const useGlobalVariants = createUseGlobalVariants({
 *   platform: usePlatform,
 *   theme: useTheme,
 * });
 *
 * // PlasmicComponent.tsx
 * import { useGlobalVariants } from "./plasmic_project";
 *
 * export function PlasmicComponent() {
 *   // ...
 *   const globalVariants = useGlobalVariants();
 *   // ...
 * }
 * ```
 */
export function createUseGlobalVariants<
  T extends { [gv: string]: () => string | undefined }
>(globalVariantHooks: T): UseGlobalVariants {
  return () => {
    return ensureGlobalVariants(
      Object.fromEntries(
        Object.entries(globalVariantHooks).map<[string, string | undefined]>(
          ([globalVariant, useHook]) => [globalVariant, useHook()]
        )
      )
    );
  };
}

/**
 * @deprecated - new generated code should use `useGlobalVariants` instead
 *
 * Usage:
 * ```
 * // PlasmicComponent.tsx
 * import { useTheme } from "./PlasmicGlobalVariant__Theme";
 * import { usePlatform } from "./PlasmicGlobalVariant__Platform";
 *
 * export function PlasmicComponent() {
 *   // ...
 *   const globalVariants = ensureGlobalVariants({
 *     platform: usePlatform(),
 *     theme: useTheme(),
 *   });
 *   // ...
 * }
 * ```
 */
export function ensureGlobalVariants<T extends GlobalVariants>(
  globalVariants: T
): GlobalVariants {
  Object.entries(globalVariants)
    .filter(([_, value]) => isDefaultValue(value))
    .forEach(([key, _]) => {
      (globalVariants as any)[key] = undefined;

      if (!seenDefaultVariants[key] && process.env.NODE_ENV === "development") {
        seenDefaultVariants[key] = true;
        const providerName = `${key[0].toUpperCase()}${key.substring(
          1
        )}Context.Provider`;
        console.warn(
          `Plasmic context value for global variant "${key}" was not provided; please use ${providerName} at the root of your React app. Learn More: https://www.plasmic.app/learn/other-assets/#global-variants`
        );
      }
    });
  return globalVariants;
}
