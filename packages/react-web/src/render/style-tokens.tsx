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
 * All style token data for this project.
 *
 * Usage:
 *
 * ```
 * // PlasmicStyleTokensProvider.ts
 * import { usePlatform } from "./PlasmicGlobalVariant__Platform";
 * import { useTheme } from "./PlasmicGlobalVariant__Theme";
 * import projectcss from "./plasmic.module.css";
 *
 * const projectStyleTokenData: ProjectStyleTokenData = {
 *   base: projectcss.plasmic_tokens,
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
  base: ClassName;
  varianted: {
    className: ClassName;
    groupName: string;
    variant: string;
  }[];
}

type UseStyleTokens = () => ClassName[];

/**
 * Returns style tokens. If the context is not available, falls back to the
 * current project's styles.
 *
 * Usage:
 * ```
 * // PlasmicStyleTokensProvider.ts
 * export const useStyleTokens = createUseStyleTokens(
 *   projectStyleTokenData,
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
    const overrides = React.useContext(StyleTokensContext);
    const globalVariants = useGlobalVariants();
    return React.useMemo(() => {
      if (overrides && overrides.length > 0) {
        return overrides;
      } else {
        return activeTokensClassNames(tokenData, globalVariants);
      }
    }, [overrides, globalVariants, tokenData]);
  };
}

/**
 * Creates a StyleTokens context provider for a given project, which includes
 * its tokens, overrides, and all tokens from its dependencies.
 *
 * Usage:
 * ```
 * // PlasmicStyleTokensProvider.ts
 * export const StyleTokensProvider = createStyleTokensProvider(
 *   projectStyleTokenData,
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
  return [tokenData.base, ...varianted];
}
