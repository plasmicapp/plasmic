/** Shared exports for both "default" and "react-server" exports live here. */

import type { InitOptions as LoaderReactInitOptions } from "@plasmicapp/loader-react/react-server-conditional";

export interface NextInitOptions extends LoaderReactInitOptions {
  /**
   * next/navigation doesn't exist prior to Next.js 13, so Plasmic can't assume the dependency exists.
   * If you use the App Router (which depends on next/navigation), you'll need to pass the module here.
   *
   * ```tsx
   * import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
   * import * as NextNavigation from "next/navigation";
   *
   * export const PLASMIC = initPlasmicLoader({
   *   nextNavigation: NextNavigation,
   *   projects: [
   *     // your projects
   *   ],
   * });
   * ```
   */
  nextNavigation?: {
    notFound: unknown;
    redirect: unknown;
    useParams: unknown;
    usePathname: unknown;
    useRouter: unknown;
    useSearchParams: unknown;
  };
}

export type {
  ComponentMeta,
  ComponentRenderData,
  InitOptions,
  PageMeta,
  PageMetadata,
} from "@plasmicapp/loader-react/react-server-conditional";
