const isDefaultValue = (val: string) => val === "PLEASE_RENDER_INSIDE_PROVIDER";
const seenDefaultVariants: Record<string, boolean> = {};
export function ensureGlobalVariants<T extends Record<string, any>>(
  globalVariantValues: T
) {
  Object.entries(globalVariantValues)
    .filter(([_, value]) => isDefaultValue(value))
    .forEach(([key, _]) => {
      (globalVariantValues as any)[key] = undefined;

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
  return globalVariantValues;
}
