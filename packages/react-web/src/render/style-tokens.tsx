import React from "react";
import { hasVariant } from "./elements";
import { GlobalVariants, UseGlobalVariants } from "./global-variants";

type ClassName = string;

/**
 * Context that enables a project's style tokens to be propagated across projects.
 *
 * The value is an array of class names, including the class name for the base
 * variant and active global variants. The class names should be applied to all
 * Plasmic content.
 */
const StyleTokensContext = React.createContext<ClassName[] | undefined>(
  undefined
);

/**
 * All style token data (except overrides) for this project.
 * This data is used as the default context value.
 *
 * We don't include the overrides because the Provider (that wraps the components) decides which project's overrides to apply.
 *
 * Usage:
 *
 * ```
 * // PlasmicStyleTokensProvider.ts
 * import { usePlatform } from "./PlasmicGlobalVariant__Platform";
 * import { useTheme } from "./PlasmicGlobalVariant__Theme";
 * import projectcss from "./plasmic.module.css";
 * import depcss from "../dep/plasmic.module.css";
 *
 * const data: ProjectStyleTokenData = {
 *   base: `${projectcss.plasmic_tokens} ${depcss.plasmic_tokens}`,
 *   varianted: [
 *     {
 *       className: projectcss.global_platform_windows,
 *       groupName: "platform",
 *       variant: "windows"
 *     },
 *     {
 *       className: projectcss.global_platform_osx,
 *       groupName: "platform",
 *       variant: "osx"
 *     },
 *     {
 *       className: projectcss.global_theme_light,
 *       groupName: "theme",
 *       variant: "light"
 *     },
 *     {
 *       className: projectcss.global_theme_dark,
 *       groupName: "theme",
 *       variant: "dark"
 *     },
 *   ],
 * };
 * ```
 */
interface ProjectStyleTokenData {
  // An older version of codegen generated `base: projectcss.plasmic_tokens`
  // We make `base` optional since projectcss might not have plasmic_tokens
  base?: ClassName;
  varianted: {
    className: ClassName;
    groupName: string;
    variant: string;
  }[];
}

type UseStyleTokens = () => ClassName[];

/**
 * Creates a useStyleTokens hook for a given project that returns class names for the given project's tokens plus token overrides from StyleTokensProvider if present.
 *
 * Usage:
 * ```
 * // PlasmicStyleTokensProvider.ts
 * export const useStyleTokens = createUseStyleTokens(
 *   data,
 *   useGlobalVariants,
 * );
 *
 * // PlasmicPage.tsx
 * import { useStyleTokens } from "./plasmic_project";
 *
 * export function PlasmicPage() {
 *   const styleTokensClassNames = useStyleTokens();
 *   return (
 *     <div className={classNames(
 *         projectcss.all,
 *         projectcss.root_reset,
 *         projectcss.plasmic_default_styles,
 *         projectcss.plasmic_mixins,
 *         styleTokensClassNames,
 *     )}>
 *       <h1 className={projectcss.all}>
 *         Hello, world!
 *       </h1>
 *     </div>
 *   );
 * }
 * ```
 */
export function createUseStyleTokens(
  tokenData: ProjectStyleTokenData,
  useGlobalVariants: UseGlobalVariants
): UseStyleTokens {
  return () => {
    const ctxClassNames = React.useContext(StyleTokensContext);
    const globalVariants = useGlobalVariants();
    return React.useMemo(() => {
      // Use a set to deduplicate
      return Array.from(
        new Set([
          ...(ctxClassNames ?? []),
          ...activeTokensClassNames(tokenData, globalVariants),
        ])
      );
    }, [ctxClassNames, globalVariants]);
  };
}

/**
 * Creates a StyleTokensProvider for a given project to allow propagating its overrides to components of other projects.
 *
 * To ensure all tokens in the overrides class name resolve properly, the base and varianted class names must be included.
 *
 * Usage:
 * ```
 * // PlasmicStyleTokensProvider.ts
 * export const StyleTokensProvider = createStyleTokensProvider(
 *   { base: `${projectcss.plasmic_tokens_override} ${data.base}`, varianted: data.varianted },
 *   useGlobalVariants,
 * );
 *
 * // Page.tsx
 * import { StyleTokensProvider } from "./plasmic_project";
 *
 * export default function Page() {
 *   return (
 *     <PlatformContext.Provider value="osx">
 *       <ThemeContext.Provider value="dark">
 *         <StyleTokensProvider>
 *           <PlasmicPage />
 *         </StyleTokensProvider>
 *       </ThemeContext.Provider>
 *     </PlatformContext.Provider>
 *   );
 * }
 * ```
 */
export function createStyleTokensProvider(
  tokenData: ProjectStyleTokenData,
  useGlobalVariants: UseGlobalVariants
): React.ComponentType<React.PropsWithChildren> {
  return (props: React.PropsWithChildren) => {
    const globalVariants = useGlobalVariants();
    const tokens = React.useMemo(() => {
      return activeTokensClassNames(tokenData, globalVariants);
    }, [globalVariants, tokenData]);
    return (
      <StyleTokensContext.Provider value={tokens}>
        {props.children}
      </StyleTokensContext.Provider>
    );
  };
}

/**
 * Gets the class names for the base tokens and the varianted tokens for active
 * global variants.
 */
function activeTokensClassNames(
  tokenData: ProjectStyleTokenData,
  globalVariants: GlobalVariants
): ClassName[] {
  const varianted = tokenData.varianted
    .filter(({ groupName, variant }) =>
      hasVariant(globalVariants, groupName, variant)
    )
    .map(({ className }) => className);
  return [...(tokenData.base?.split(" ") ?? []), ...varianted];
}
